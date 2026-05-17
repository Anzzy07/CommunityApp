import { COLORS } from "@/src/colors";
import CommentListItem from "@/src/components/CommentListItem";
import PollListItem from "@/src/components/PollListItem";
import PostListItem from "@/src/components/PostListItem";
import { useCreateComment } from "@/src/hooks/mutations/useCommentMutations";
import { useSupabaseGroupMembers } from "@/src/hooks/queries/useSupabaseGroupMembers";
import { useSupabasePostDetails } from "@/src/hooks/queries/useSupabasePostDetails";
import { Comment } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
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

// Displays a single post with all its comments and nested reply functionality
export default function DetailedPost() {
  // Extract the post ID from the route parameters
  const { id } = useLocalSearchParams();

  // Used to apply correct bottom padding above the device home indicator
  const insets = useSafeAreaInsets();

  // Get the currently authenticated user from Clerk
  const { user } = useUser();

  // Local state for the comment input field text
  const [comment, setComment] = useState("");

  // Tracks which comment the user is currently replying to
  // Stores the username and comment ID for display and submission
  const [replyingTo, setReplyingTo] = useState<{
    username: string;
    commentId: string;
  } | null>(null);

  // Tracks whether the comment input field is focused
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Optimistic comments stored locally to appear instantly before database confirms
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);

  // Ref used to programmatically focus the comment input when the user taps Reply
  const inputRef = useRef<TextInput | null>(null);

  // Fetch the post and its comments from Supabase using React Query
  const { data, isLoading, error } = useSupabasePostDetails(id as string);

  // Fetch the communities the current user has joined to check membership
  const { data: groupMembers = [] } = useSupabaseGroupMembers(user?.id || "");

  // Mutation hook for submitting a new comment to the database
  const createCommentMutation = useCreateComment();

  // Sets the reply target and focuses the comment input when the user taps reply on a comment
  const handleReplyPress = useCallback(
    (commentId: string, username: string) => {
      setReplyingTo({ username, commentId });
      inputRef.current?.focus();
    },
    [],
  );

  // Clears the reply state when the user cancels a reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Submits the comment to the database
  // Adds an optimistic comment to the local state immediately so it appears without waiting
  const handleSend = async () => {
    if (!comment.trim() || !user?.id || !data?.post) return;

    const trimmed = comment.trim();

    // Use parent comment ID if replying, otherwise null for a root-level comment
    const parentId = replyingTo?.commentId || null;

    // Build a temporary comment object with a prefixed ID to identify it as optimistic
    // This appears in the list immediately and is removed once the real record arrives
    const optimisticComment: Comment = {
      id: `optimistic-${Date.now()}`,
      post_id: data.post.id,
      user_id: user.id,
      parent_id: parentId,
      comment: trimmed,
      created_at: new Date().toISOString(),
      upvotes: 0,
      user: {
        id: user.id,
        name:
          (user.fullName as string | null) ??
          (user.username as string | null) ??
          "You",
        image: (user.imageUrl as string | null) ?? null,
      },
      replies: [],
    };

    // Add the optimistic comment to local state so it renders immediately
    setOptimisticComments((prev) => [...prev, optimisticComment]);

    // Clear the input and reply state without waiting for the server response
    setComment("");
    setReplyingTo(null);

    try {
      await createCommentMutation.mutateAsync({
        postId: data.post.id,
        userId: user.id,
        comment: trimmed,
        parentId,
      });

      // Remove the optimistic comment once the mutation succeeds
      // The real comment will arrive when React Query invalidates and refetches the cache
      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id),
      );
    } catch (err: any) {
      // Roll back the optimistic comment if the database call fails
      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id),
      );
      Alert.alert("Error", err.message || "Failed to post comment");
    }
  };

  // Merges real comments from React Query with locally stored optimistic comments
  // Handles both root-level comments and nested replies at any depth in the tree
  const allComments = useMemo(() => {
    if (!data?.comments) return optimisticComments;
    if (optimisticComments.length === 0) return data.comments;

    // Separate optimistic comments into root-level and reply categories
    const rootOptimistic = optimisticComments.filter((c) => !c.parent_id);
    const replyOptimistic = optimisticComments.filter((c) => !!c.parent_id);

    // Walk the existing comment tree recursively and attach optimistic replies
    // to their correct parent at whatever nesting depth they belong to
    const patchReplies = (comments: Comment[]): Comment[] =>
      comments.map((c) => {
        const newReplies = replyOptimistic.filter((r) => r.parent_id === c.id);
        return {
          ...c,
          replies:
            newReplies.length > 0
              ? [...patchReplies(c.replies), ...newReplies]
              : patchReplies(c.replies),
        };
      });

    // Combine the patched real comments with any new root-level optimistic comments
    return [...patchReplies(data.comments), ...rootOptimistic];
  }, [data?.comments, optimisticComments]);

  // Check if the current user has joined the community this post belongs to
  const isJoined = useMemo(() => {
    if (!data?.post) return false;
    return groupMembers.some((m) => m.group_id === data.post.group.id);
  }, [groupMembers, data?.post?.group?.id]);

  // Stable renderItem function so FlatList does not re-render all comment cards
  // when unrelated state such as the comment input text changes
  const renderComment = useCallback(
    ({ item }: { item: Comment }) => (
      <CommentListItem
        comment={item}
        depth={0}
        handleReplyPress={handleReplyPress}
      />
    ),
    [handleReplyPress],
  );

  // Stable key extractor to help FlatList track comment items efficiently
  const keyExtractor = useCallback((item: Comment) => item.id, []);

  // Renders an empty state message when the post has no comments yet
  const renderEmptyComments = useCallback(
    () => (
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
    ),
    [],
  );

  // Show a full-screen loading spinner while the post data is being fetched
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  // Show an error screen if the post was not found or the fetch failed
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

  const { post } = data;

  // Render PollListItem if the post contains a poll, otherwise render PostListItem
  const ListHeader = post.poll ? (
    <PollListItem post={post} isDetailedPost isJoined={isJoined} />
  ) : (
    <PostListItem post={post} isDetailedPost isJoined={isJoined} />
  );

  return (
    // KeyboardAvoidingView shifts the content up when the keyboard opens on iOS
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={insets.top + 10}
    >
      <FlatList
        // Post card is rendered as the list header above the comments section
        ListHeaderComponent={ListHeader}
        data={allComments}
        keyExtractor={keyExtractor}
        renderItem={renderComment}
        ListEmptyComponent={renderEmptyComments}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // Allow comment items to be tapped while the keyboard is open
        keyboardShouldPersistTaps="handled"
        // Performance optimisations for smoother scrolling on longer threads
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={8}
      />

      {/* Comment input bar fixed to the bottom of the screen */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        {/* Reply preview banner shown when the user is replying to a specific comment */}
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyIndicator} />
            <Text style={styles.replyText}>
              Replying to{" "}
              <Text style={styles.replyUsername}>@{replyingTo.username}</Text>
            </Text>
            {/* Cancel button clears the reply state */}
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
            // Disable the input while a comment submission is in progress
            editable={!createCommentMutation.isPending}
          />

          {/* Send button only appears when the input is focused or contains text */}
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
              {/* Show a spinner while the comment is being submitted */}
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
    marginTop: 17,
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
    fontSize: 16,
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
    fontSize: 18,
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
    opacity: 0.7,
    backgroundColor: COLORS.secondary,
  },
});
