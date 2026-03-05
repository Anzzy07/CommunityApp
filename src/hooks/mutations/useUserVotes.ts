import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

// Check if user has voted on a post
export function useUserPostVote(postId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["post-vote", postId, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data } = await supabase
        .from("post_votes")
        .select("vote_type")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      return data?.vote_type || null;
    },
    enabled: !!userId && !!postId,
    staleTime: 1000 * 60 * 5,
  });
}

// Check if user has awarded a post
export function useUserPostAward(postId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["post-award", postId, userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data } = await supabase
        .from("post_awards")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      return !!data;
    },
    enabled: !!userId && !!postId,
    staleTime: 1000 * 60 * 5,
  });
}

// Check if user has voted on a comment
export function useUserCommentVote(
  commentId: string,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ["comment-vote", commentId, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data } = await supabase
        .from("comment_votes")
        .select("vote_type")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      return data?.vote_type || null;
    },
    enabled: !!userId && !!commentId,
    staleTime: 1000 * 60 * 5,
  });
}

// Check if user has awarded a comment
export function useUserCommentAward(
  commentId: string,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ["comment-award", commentId, userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data } = await supabase
        .from("comment_awards")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      return !!data;
    },
    enabled: !!userId && !!commentId,
    staleTime: 1000 * 60 * 5,
  });
}
