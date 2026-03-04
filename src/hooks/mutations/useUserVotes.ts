import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

// Fetches user's vote on a specific post
export function useUserPostVote(postId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["user-post-vote", postId, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("post_votes")
        .select("vote_type")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      if (error) {
        // No vote found is not an error
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data?.vote_type as "up" | "down" | null;
    },
    enabled: !!userId && !!postId,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
}

// Fetches user's vote on a specific comment
export function useUserCommentVote(
  commentId: string,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ["user-comment-vote", commentId, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("comment_votes")
        .select("vote_type")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      if (error) {
        // No vote found is not an error
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data?.vote_type as "up" | "down" | null;
    },
    enabled: !!userId && !!commentId,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetches if user has awarded a post
export function useUserPostAward(postId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["user-post-award", postId, userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase
        .from("post_awards")
        .select("id")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return false;
        throw error;
      }

      return !!data;
    },
    enabled: !!userId && !!postId,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetches if user has awarded a comment
export function useUserCommentAward(
  commentId: string,
  userId: string | undefined,
) {
  return useQuery({
    queryKey: ["user-comment-award", commentId, userId],
    queryFn: async () => {
      if (!userId) return false;

      const { data, error } = await supabase
        .from("comment_awards")
        .select("id")
        .eq("comment_id", commentId)
        .eq("user_id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return false;
        throw error;
      }

      return !!data;
    },
    enabled: !!userId && !!commentId,
    staleTime: 1000 * 60 * 5,
  });
}
