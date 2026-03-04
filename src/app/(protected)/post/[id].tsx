import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { COLORS } from "@/src/colors";
import CommentListItem from "@/src/components/CommentListItem";
import PostListItem from "@/src/components/PostListItem";
import { useCreateComment } from "@/src/hooks/mutations/useCommentMutations";
import { useSupabasePostDetails } from "@/src/hooks/queries/useSupabasePostDetails";

import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Displays a single post with all its comments and reply functionality
export default function DetailedPost() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const groupMembers = useAtomValue(groupMembersAtom);

  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    username: string;
    commentId: string;
  } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<TextInput | null>(null);

  // Fetch post and comments from Supabase - MUST be before any conditional returns
  const { data, isLoading, error } = useSupabasePostDetails(id as string);

  // Create comment mutation - MUST be before any conditional returns
  const createCommentMutation = useCreateComment();

  // Sets reply state and focuses the comment input - MUST be before any conditional returns
  const handleReplyPress = useCallback(
    (commentId: string, username: string) => {
      setReplyingTo({ username, commentId });
      inputRef.current?.focus();
    },
    [],
  );

  // Submits the comment to Supabase
  const handleSend = async () => {
    if (!comment.trim() || !user?.id) {
      if (!user?.id) {
        Alert.alert("Sign in required", "Please sign in to comment");
      }
      return;
    }

    try {
      await createCommentMutation.mutateAsync({
        postId: data!.post.id,
        userId: user.id,
        comment: comment.trim(),
        parentId: replyingTo?.commentId || null,
      });

      // Clear input and reply state on success
      setComment("");
      setReplyingTo(null);

      // Show success message
      Alert.alert("Success", "Comment posted!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to post comment");
    }
  };

  // Clears the reply state
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Checks if user is a member of the post's community
  const isJoined = data?.post
    ? groupMembers.some(
        (m) => m.group_id === data.post.group.id && m.user_id === user?.id,
      )
    : false;

  // NOW we can do conditional returns AFTER all hooks are called
  // Shows loading spinner while fetching
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  // Shows error if post not found or fetch failed
  if (error || !data) {
    return (
      <View style={styles.notFoundContainer}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={COLORS.textSecondary}
        />
        <Text style={styles.notFoundTitle}>Post Not Found</Text>
        <Text style={styles.notFoundSubtitle}>
          {error?.message || "This post may have been deleted or doesn't exist"}
        </Text>
      </View>
    );
  }

  const { post, comments } = data;

  // Renders individual comment with proper nesting
  const renderComment = ({ item }: { item: (typeof comments)[0] }) => (
    <CommentListItem
      comment={item}
      depth={0}
      handleReplyPress={handleReplyPress}
    />
  );

  // Renders empty state when there are no comments
  const renderEmptyComments = () => (
    <View style={styles.emptyCommentsContainer}>
      <MaterialCommunityIcons
        name="comment-outline"
        size={48}
        color={COLORS.textSecondary}
      />
      <Text style={styles.emptyCommentsTitle}>No comments yet</Text>
      <Text style={styles.emptyCommentsSubtitle}>
        Be the first to share your thoughts!
      </Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={insets.top + 10}
    >
      <FlatList
        ListHeaderComponent={
          <PostListItem post={post} isDetailedPost isJoined={isJoined} />
        }
        data={comments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        ListEmptyComponent={renderEmptyComments}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyIndicator} />
            <Text style={styles.replyText}>
              Replying to{" "}
              <Text style={styles.replyUsername}>@{replyingTo.username}</Text>
            </Text>
            <Pressable onPress={handleCancelReply} hitSlop={10}>
              <MaterialCommunityIcons
                name="close-circle"
                size={18}
                color={COLORS.textSecondary}
              />
            </Pressable>
          </View>
        )}

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            placeholder="Join the conversation..."
            placeholderTextColor="#9CA3AF"
            value={comment}
            onChangeText={setComment}
            multiline
            style={styles.input}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            editable={!createCommentMutation.isPending}
          />

          {(isInputFocused || comment.trim()) && (
            <Pressable
              disabled={!comment.trim() || createCommentMutation.isPending}
              onPress={handleSend}
              style={[
                styles.sendButton,
                (!comment.trim() || createCommentMutation.isPending) &&
                  styles.sendButtonDisabled,
              ]}
            >
              {createCommentMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialCommunityIcons name="send" size={18} color="white" />
              )}
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    paddingBottom: 100,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: COLORS.background,
  },
  notFoundTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  notFoundSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  emptyCommentsContainer: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyCommentsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCommentsSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  inputContainer: {
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 15,
    paddingTop: 12,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  replyIndicator: {
    width: 3,
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  replyText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  replyUsername: {
    fontWeight: "600",
    color: COLORS.primary,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 12,
    borderRadius: 20,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.textPrimary,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
