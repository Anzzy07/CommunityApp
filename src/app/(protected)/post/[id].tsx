import comments from "@/assets/data/comments.json";
import posts from "@/assets/data/posts.json";
import { COLORS } from "@/src/colors";
import CommentListItem from "@/src/components/CommentListItem";
import PostListItem from "@/src/components/PostListItem";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
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

/**
 * DetailedPost - Displays a single post with all comments
 *
 * Features:
 * - Full post display with interactions
 * - Threaded comments with nesting
 * - Reply to comments
 * - Comment input with reply preview
 * - Keyboard avoidance
 * - Empty state for no comments
 */
export default function DetailedPost() {
  // Get post ID from route params
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Comment input state
  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<TextInput | null>(null);

  // Find the post
  const detailedPost = posts.find((post) => post.id === id);

  // Get all comments for this post
  const postComments = comments.filter((c) => c.post_id === detailedPost?.id);

  // Handle post not found
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

  /**
   * Handle reply button press on a comment
   * Sets reply state and focuses input
   */
  const handleReplyPress = useCallback(
    (commentId: string, username: string) => {
      setReplyingTo(username);
      inputRef.current?.focus();
    },
    [],
  );

  /**
   * Handle sending comment
   * TODO: Send to Supabase
   */
  const handleSend = () => {
    if (!comment.trim()) return;

    console.log("Sending comment:", {
      postId: detailedPost.id,
      comment: comment.trim(),
      replyTo: replyingTo,
    });

    // TODO: Add comment to Supabase
    // TODO: Update local state

    // Clear input and reply state
    setComment("");
    setReplyingTo(null);
  };

  /**
   * Cancel reply
   */
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  /**
   * Render individual comment
   */
  const renderComment = ({ item }: { item: (typeof comments)[0] }) => (
    <CommentListItem
      comment={item}
      depth={0}
      handleReplyPress={handleReplyPress}
    />
  );

  /**
   * Render empty state when no comments
   */
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
      {/* Post and Comments List */}
      <FlatList
        // Header: The full post
        ListHeaderComponent={
          <PostListItem post={detailedPost} isDetailedPost />
        }
        // Data: All comments
        data={postComments}
        keyExtractor={(item) => item.id}
        renderItem={renderComment}
        // Empty state
        ListEmptyComponent={renderEmptyComments}
        // Styling
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* COMMENT INPUT */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        {/* Reply Preview */}
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

        {/* Input and Send Button */}
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

          {/* Send Button (shows when typing or focused) */}
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
