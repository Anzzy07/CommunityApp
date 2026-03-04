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
    }: {
      commentId: string;
      userId: string;
      voteType: "up" | "down";
    }) => {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from("comment_votes")
        .select("*")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        // If same vote type, remove it (un-vote)
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("comment_votes")
            .delete()
            .eq("comment_id", commentId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          // If different vote type, update it
          const { error } = await supabase
            .from("comment_votes")
            .update({ vote_type: voteType })
            .eq("comment_id", commentId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "updated", voteType };
        }
      } else {
        // No existing vote, create new one
        const { error } = await supabase.from("comment_votes").insert({
          comment_id: commentId,
          user_id: userId,
          vote_type: voteType,
        });

        if (error) throw error;
        return { action: "created", voteType };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate post details query to refetch comments with updated votes
      queryClient.invalidateQueries({ queryKey: ["post"] });
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
    }: {
      commentId: string;
      userId: string;
      remove?: boolean;
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
    onSuccess: () => {
      // Invalidate post details query to refetch comments with updated awards
      queryClient.invalidateQueries({ queryKey: ["post"] });
    },
  });
}

// Create a new comment
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
      // Invalidate post details to refetch with new comment
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}
