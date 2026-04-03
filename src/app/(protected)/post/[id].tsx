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

// Displays a single post with all its comments and reply functionality
export default function DetailedPost() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { user } = useUser();

  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    username: string;
    commentId: string;
  } | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Optimistic comments stored locally — appear instantly before DB confirms
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);

  const inputRef = useRef<TextInput | null>(null);

  // Fetch post details and comments from Supabase using React Query
  const { data, isLoading, error } = useSupabasePostDetails(id as string);

  // Fetch group memberships to check if user has joined this community
  const { data: groupMembers = [] } = useSupabaseGroupMembers(user?.id || "");

  // Mutation hook for creating comments
  const createCommentMutation = useCreateComment();

  // Sets reply state and focuses the comment input when user taps reply
  const handleReplyPress = useCallback(
    (commentId: string, username: string) => {
      setReplyingTo({ username, commentId });
      inputRef.current?.focus();
    },
    [],
  );

  // Clears the reply state when user cancels a reply
  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  // Submits the comment — shows it instantly via optimistic update,
  // then syncs with the database in the background
  const handleSend = async () => {
    if (!comment.trim() || !user?.id || !data?.post) return;

    const trimmed = comment.trim();
    const parentId = replyingTo?.commentId || null;

    // Build a temporary comment object so it appears in the list immediately
    // Uses a unique temporary ID prefixed with "optimistic-" to identify it
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

    // Add optimistic comment to local state — renders instantly
    setOptimisticComments((prev) => [...prev, optimisticComment]);

    // Clear input and reply state immediately — don't wait for server
    setComment("");
    setReplyingTo(null);

    try {
      await createCommentMutation.mutateAsync({
        postId: data.post.id,
        userId: user.id,
        comment: trimmed,
        parentId,
      });

      // Remove optimistic comment — the real one will arrive from
      // the invalidated React Query cache after the mutation succeeds
      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id),
      );
    } catch (err: any) {
      // Roll back optimistic comment if the DB call failed
      setOptimisticComments((prev) =>
        prev.filter((c) => c.id !== optimisticComment.id),
      );
      Alert.alert("Error", err.message || "Failed to post comment");
    }
  };

  // Merges real comments from React Query with local optimistic comments.
  // Handles both root-level comments and nested replies at any depth.
  const allComments = useMemo(() => {
    if (!data?.comments) return optimisticComments;
    if (optimisticComments.length === 0) return data.comments;

    // Split optimistic comments into root-level and replies
    const rootOptimistic = optimisticComments.filter((c) => !c.parent_id);
    const replyOptimistic = optimisticComments.filter((c) => !!c.parent_id);

    // Recursively walk the comment tree and attach optimistic replies
    // to their correct parent at any nesting depth
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

    // Combine: patched real comments + any new root-level optimistic comments
    return [...patchReplies(data.comments), ...rootOptimistic];
  }, [data?.comments, optimisticComments]);

  // Memoised join status — avoids recalculating on every render
  const isJoined = useMemo(() => {
    if (!data?.post) return false;
    return groupMembers.some((m) => m.group_id === data.post.group.id);
  }, [groupMembers, data?.post?.group?.id]);

  // Stable renderItem — defined with useCallback so FlatList doesn't
  // re-render every comment card when unrelated state changes
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

  // Stable key extractor to help FlatList track items efficiently
  const keyExtractor = useCallback((item: Comment) => item.id, []);

  // Renders empty state when there are no comments yet
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

  // Shows loading spinner while fetching post data
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading post...</Text>
      </View>
    );
  }

  // Shows error state if post not found or fetch failed
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

  // Use PollListItem if the post has a poll, otherwise use PostListItem
  const ListHeader = post.poll ? (
    <PollListItem post={post} isDetailedPost isJoined={isJoined} />
  ) : (
    <PostListItem post={post} isDetailedPost isJoined={isJoined} />
  );

  return (
    // KeyboardAvoidingView pushes content up when keyboard appears on iOS
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={insets.top + 10}
    >
      <FlatList
        // Post card renders as the list header above the comments
        ListHeaderComponent={ListHeader}
        data={allComments}
        keyExtractor={keyExtractor}
        renderItem={renderComment}
        ListEmptyComponent={renderEmptyComments}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // Allows tapping comment items while keyboard is open
        keyboardShouldPersistTaps="handled"
        // Performance optimisations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={8}
      />

      {/* Comment input bar pinned to bottom of screen */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        {/* Shows who the user is replying to with a cancel option */}
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

          {/* Send button only appears when input is focused or has text */}
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
