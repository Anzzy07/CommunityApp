import { supabase } from "@/src/lib/supabase";
import { Comment } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all comments made by a specific user for the profile comments tab
// Uses the comments_with_details view which already joins user info
export function useSupabaseUserComments(userId: string) {
  return useQuery({
    queryKey: ["user-comments", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("comments_with_details")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform DB rows into typed Comment objects
      const comments: Comment[] = (data || []).map((c: any) => ({
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        parent_id: c.parent_id,
        comment: c.comment,
        created_at: c.created_at,
        upvotes: c.upvotes ?? 0,
        user: {
          id: c.user_id,
          name: c.full_name || c.username || "Unknown",
          image: c.user_image || null,
        },
        // Nested replies not shown on profile screen empty array is fine
        replies: [],
      }));

      return comments;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
