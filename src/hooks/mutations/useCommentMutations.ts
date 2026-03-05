import { supabase } from "@/src/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Vote on a comment (upvote or downvote)
export function useCommentVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      userId,
      voteType,
      postId,
    }: {
      commentId: string;
      userId: string;
      voteType: "up" | "down";
      postId: string;
    }) => {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from("comment_votes")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        // If same vote type then remove it (un-vote)
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("comment_votes")
            .delete()
            .eq("comment_id", commentId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          // If different vote type then update it
          const { error } = await supabase
            .from("comment_votes")
            .update({ vote_type: voteType })
            .eq("comment_id", commentId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "updated", voteType };
        }
      } else {
        // No existing vote then create new one
        const { error } = await supabase.from("comment_votes").insert({
          comment_id: commentId,
          user_id: userId,
          vote_type: voteType,
        });

        if (error) throw error;
        return { action: "created", voteType };
      }
    },
    onMutate: async ({ commentId, userId, voteType }) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: ["comment-vote", commentId, userId],
      });

      // Snapshot previous vote
      const previousVote = queryClient.getQueryData([
        "comment-vote",
        commentId,
        userId,
      ]);

      // Optimistically update vote status
      queryClient.setQueryData(["comment-vote", commentId, userId], voteType);

      return { previousVote };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousVote !== undefined) {
        queryClient.setQueryData(
          ["comment-vote", variables.commentId, variables.userId],
          context.previousVote,
        );
      }
    },
    onSettled: async (_, __, variables) => {
      // Refetch to get updated comment vote count from database
      await queryClient.refetchQueries({
        queryKey: ["post", variables.postId],
      });
      await queryClient.refetchQueries({
        queryKey: ["comment-vote", variables.commentId, variables.userId],
      });
    },
  });
}

// Give or remove award from a comment
export function useCommentAward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      userId,
      remove = false,
      postId,
    }: {
      commentId: string;
      userId: string;
      remove?: boolean;
      postId: string;
    }) => {
      if (remove) {
        // Remove award
        const { error } = await supabase
          .from("comment_awards")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);

        if (error) throw error;
        return { action: "removed" };
      } else {
        // Give award
        const { error } = await supabase.from("comment_awards").insert({
          comment_id: commentId,
          user_id: userId,
        });

        if (error) throw error;
        return { action: "created" };
      }
    },
    onMutate: async ({ commentId, userId, remove }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: ["comment-award", commentId, userId],
      });

      // Snapshot previous award status
      const previousAward = queryClient.getQueryData([
        "comment-award",
        commentId,
        userId,
      ]);

      // Optimistically update award status
      queryClient.setQueryData(["comment-award", commentId, userId], !remove);

      return { previousAward };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousAward !== undefined) {
        queryClient.setQueryData(
          ["comment-award", variables.commentId, variables.userId],
          context.previousAward,
        );
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch to ensure sync with server
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      queryClient.invalidateQueries({
        queryKey: ["comment-award", variables.commentId, variables.userId],
      });
    },
  });
}

// Create a new comment or reply
export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      comment,
      parentId,
    }: {
      postId: string;
      userId: string;
      comment: string;
      parentId?: string | null;
    }) => {
      // Insert new comment
      const { data, error } = await supabase
        .from("comments")
        .insert({
          post_id: postId,
          user_id: userId,
          comment: comment,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Refetch post details to show new comment
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

// Edit an existing comment
export function useEditComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      comment,
      postId,
    }: {
      commentId: string;
      comment: string;
      postId: string;
    }) => {
      // Update comment text
      const { data, error } = await supabase
        .from("comments")
        .update({ comment })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Refetch to show updated comment
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

// Delete a comment
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
    }: {
      commentId: string;
      postId: string;
    }) => {
      // Delete comment from database
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return { commentId };
    },
    onSuccess: (_, variables) => {
      // Refetch to remove deleted comment from UI
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}
