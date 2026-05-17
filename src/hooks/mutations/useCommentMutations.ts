import { supabase } from "@/src/lib/supabase";
import { Comment, Post } from "@/src/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Update a comment's upvote count inside the nested comment tree
function patchCommentInTree(
  comments: Comment[],
  commentId: string,
  updater: (c: Comment) => Comment,
): Comment[] {
  return comments.map((c) => {
    if (c.id === commentId) return updater(c);
    if (c.replies.length > 0) {
      return {
        ...c,
        replies: patchCommentInTree(c.replies, commentId, updater),
      };
    }
    return c;
  });
}

// Patch nr_of_comments for a post inside the infinite feed pages
function patchCommentCount(old: any, postId: string, delta: number): any {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page: Post[]) =>
      page.map((post) =>
        post.id === postId
          ? {
              ...post,
              nr_of_comments: Math.max(0, post.nr_of_comments + delta),
            }
          : post,
      ),
    ),
  };
}

// Vote on a comment optimistic update on vote status and count
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
      const { data: existingVote } = await supabase
        .from("comment_votes")
        .select("vote_type")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("comment_votes")
            .delete()
            .eq("comment_id", commentId)
            .eq("user_id", userId);
          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          const { error } = await supabase
            .from("comment_votes")
            .update({ vote_type: voteType })
            .eq("comment_id", commentId)
            .eq("user_id", userId);
          if (error) throw error;
          return { action: "updated", voteType };
        }
      } else {
        const { error } = await supabase.from("comment_votes").insert({
          comment_id: commentId,
          user_id: userId,
          vote_type: voteType,
        });
        if (error) throw error;
        return { action: "created", voteType };
      }
    },

    onMutate: async ({ commentId, userId, voteType, postId }) => {
      await queryClient.cancelQueries({ queryKey: ["post", postId] });
      await queryClient.cancelQueries({
        queryKey: ["comment-vote", commentId, userId],
      });

      const prevVote = queryClient.getQueryData([
        "comment-vote",
        commentId,
        userId,
      ]) as "up" | "down" | null;

      const prevPost = queryClient.getQueryData(["post", postId]);

      // Upvote delta only downvotes don't affect displayed count
      let delta = 0;
      if (voteType === "up") {
        delta = prevVote === "up" ? -1 : 1;
      } else {
        if (prevVote === "up") delta = -1;
      }

      const newVote: "up" | "down" | null =
        prevVote === voteType ? null : voteType;

      queryClient.setQueryData(["comment-vote", commentId, userId], newVote);

      queryClient.setQueryData(["post", postId], (old: any) => {
        if (!old?.comments) return old;
        return {
          ...old,
          comments: patchCommentInTree(old.comments, commentId, (c) => ({
            ...c,
            upvotes: (c.upvotes ?? 0) + delta,
          })),
        };
      });

      return { prevVote, prevPost };
    },

    onError: (_err, variables, context) => {
      if (context?.prevVote !== undefined) {
        queryClient.setQueryData(
          ["comment-vote", variables.commentId, variables.userId],
          context.prevVote,
        );
      }
      if (context?.prevPost !== undefined) {
        queryClient.setQueryData(["post", variables.postId], context.prevPost);
      }
    },

    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      queryClient.invalidateQueries({
        queryKey: ["comment-vote", variables.commentId, variables.userId],
      });
    },
  });
}

// Award a comment optimistic update
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
        const { error } = await supabase
          .from("comment_awards")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);
        if (error) throw error;
        return { action: "removed" };
      } else {
        const { error } = await supabase.from("comment_awards").insert({
          comment_id: commentId,
          user_id: userId,
        });
        if (error) throw error;
        return { action: "created" };
      }
    },

    onMutate: async ({ commentId, userId, remove }) => {
      await queryClient.cancelQueries({
        queryKey: ["comment-award", commentId, userId],
      });
      const previousAward = queryClient.getQueryData([
        "comment-award",
        commentId,
        userId,
      ]);
      queryClient.setQueryData(["comment-award", commentId, userId], !remove);
      return { previousAward };
    },

    onError: (_err, variables, context) => {
      if (context?.previousAward !== undefined) {
        queryClient.setQueryData(
          ["comment-award", variables.commentId, variables.userId],
          context.previousAward,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      queryClient.invalidateQueries({
        queryKey: ["comment-award", variables.commentId, variables.userId],
      });
    },
  });
}

// Create a comment instantly updates comment count in feed
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
          comment,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const prevPosts = queryClient.getQueryData(["posts"]);

      // Instantly plus one on the feed comment count
      queryClient.setQueryData(["posts"], (old: any) =>
        patchCommentCount(old, postId, +1),
      );

      return { prevPosts };
    },

    onError: (_err, _vars, context) => {
      if (context?.prevPosts !== undefined) {
        queryClient.setQueryData(["posts"], context.prevPosts);
      }
    },

    onSuccess: (_data, variables) => {
      // Refresh detail page to show the new comment in the tree
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },

    onSettled: () => {
      // Sync feed in background
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// Edit a comment
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
      const { data, error } = await supabase
        .from("comments")
        .update({ comment })
        .eq("id", commentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

// Delete a comment instantly updates comment count in feed
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
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
      return { commentId };
    },

    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const prevPosts = queryClient.getQueryData(["posts"]);

      // Instantly minus one on the feed comment count
      queryClient.setQueryData(["posts"], (old: any) =>
        patchCommentCount(old, postId, -1),
      );

      return { prevPosts };
    },

    onError: (_err, _vars, context) => {
      if (context?.prevPosts !== undefined) {
        queryClient.setQueryData(["posts"], context.prevPosts);
      }
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}
