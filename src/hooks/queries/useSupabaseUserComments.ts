import { supabase } from "@/src/lib/supabase";
import { Comment } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseUserComments(userId: string) {
  return useQuery({
    queryKey: ["user-comments", userId],
    queryFn: async () => {
      //   console.log("🔍 Fetching comments for user:", userId);

      if (!userId) {
        // console.log("⚠️ No userId provided");
        return [];
      }

      const { data, error } = await supabase
        .from("comments_with_details")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching user comments:", error);
        throw error;
      }

      //   console.log("✅ Fetched user comments:", data?.length || 0);

      // Transform to Comment type
      const comments: Comment[] = (data || []).map((c: any) => ({
        id: c.id,
        post_id: c.post_id,
        user_id: c.user_id,
        parent_id: c.parent_id,
        comment: c.comment,
        created_at: c.created_at,
        upvotes: c.upvotes || 0,
        user: {
          id: c.user_id,
          name: c.full_name || c.username || "Unknown",
          image: c.user_image || null,
        },
        replies: [], // No showing nested replies in profile screen
      }));

      return comments;
    },
    enabled: !!userId,
  });
}
