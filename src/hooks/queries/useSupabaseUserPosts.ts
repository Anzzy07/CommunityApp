import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseUserPosts(userId: string) {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      console.log("🔍 Fetching posts for user:", userId);

      if (!userId) {
        console.log("⚠️ No userId provided");
        return [];
      }

      const { data, error } = await supabase
        .from("posts_with_details")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching user posts:", error);
        throw error;
      }

      console.log("✅ Fetched user posts:", data?.length || 0);

      // Transform the data to match Post type
      const posts: Post[] = (data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        description: post.description,
        image: post.image_url,
        created_at: post.created_at,
        upvotes: post.upvotes || 0,
        nr_of_comments: post.comment_count || 0,
        user: {
          id: post.user_id,
          name: post.full_name || post.username || "Unknown",
          image: post.user_image || null,
        },
        group: {
          id: post.group_id,
          name: post.group_name || "Unknown",
          image: post.group_image || null,
        },
        poll: null,
      }));

      return posts;
    },
    enabled: !!userId,
  });
}
