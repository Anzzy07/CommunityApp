import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseUserStats(userId: string) {
  return useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      if (!userId) {
        return { totalPosts: 0, totalUpvotes: 0, totalComments: 0 };
      }

      // Get total posts count
      const { count: postsCount, error: postsError } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (postsError) {
        console.error("❌ Error fetching posts count:", postsError);
      }

      // Get total upvotes across all posts
      const { data: postsData, error: upvotesError } = await supabase
        .from("posts")
        .select("upvotes")
        .eq("user_id", userId);

      if (upvotesError) {
        console.error("❌ Error fetching upvotes:", upvotesError);
      }

      const totalUpvotes =
        postsData?.reduce((sum, post) => sum + (post.upvotes || 0), 0) || 0;

      // Get total comments count
      const { count: commentsCount, error: commentsError } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if (commentsError) {
        console.error("❌ Error fetching comments count:", commentsError);
      }

      // console.log(" User stats:", {
      //   totalPosts: postsCount || 0,
      //   totalUpvotes,
      //   totalComments: commentsCount || 0,
      // });

      return {
        totalPosts: postsCount || 0,
        totalUpvotes,
        totalComments: commentsCount || 0,
      };
    },
    enabled: !!userId,
  });
}
