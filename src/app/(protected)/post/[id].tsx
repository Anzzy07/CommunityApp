import comments from "@/assets/data/comments.json";
import posts from "@/assets/data/posts.json";
import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { COLORS } from "@/src/colors";
import CommentListItem from "@/src/components/CommentListItem";
import PostListItem from "@/src/components/PostListItem";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useRef, useState } from "react";
import {
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

const CURRENT_USER_ID = "user-21";

// Displays a single post with all its comments and reply functionality
export default function DetailedPost() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const groupMembers = useAtomValue(groupMembersAtom);

  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<TextInput | null>(null);

  const detailedPost = posts.find((post) => post.id === id);
  const postComments = comments.filter((c) => c.post_id === detailedPost?.id);

  // Checks if user is a member of the post's community
  const isJoined = detailedPost
    ? groupMembers.some(
        (m) =>
          m.group_id === detailedPost.group.id && m.user_id === CURRENT_USER_ID,
      )
    : false;

  if (!detailedPost) {
    return (
      <View style={styles.notFoundContainer}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={COLORS.textSecondary}
        />
        <Text style={styles.notFoundTitle}>Post Not Found</Text>
        <Text style={styles.notFoundSubtitle}>
          This post may have been deleted or doesn't exist
        </Text>
      </View>
    );
  }

  // Sets reply state and focuses the comment input
  const handleReplyPress = useCallback(
    (commentId: string, username: string) => {
      setReplyingTo(username);
      inputRef.current?.focus();
    },
    [],
  );

  // Submits the comment to the server
  const handleSend = () => {
    if (!comment.trim()) return;

    console.log("Sending comment:", {
      postId: detailedPost.id,
      comment: comment.trim(),
      replyTo: replyingTo,
    });

    // TODO: Add comment to Supabase
    // TODO: Update local state

    setComment("");
    setReplyingTo(null);
  };

  // Clears the reply state
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

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
          <PostListItem
            post={detailedPost}
            isDetailedPost
            isJoined={isJoined}
          />
        }
        data={postComments}
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
              <Text style={styles.replyUsername}>@{replyingTo}</Text>
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
          />

          {(isInputFocused || comment.trim()) && (
            <Pressable
              disabled={!comment.trim()}
              onPress={handleSend}
              style={[
                styles.sendButton,
                !comment.trim() && styles.sendButtonDisabled,
              ]}
            >
              <MaterialCommunityIcons name="send" size={18} color="white" />
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
