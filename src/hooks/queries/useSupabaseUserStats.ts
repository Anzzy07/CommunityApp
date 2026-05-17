import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

// Fetches total posts upvotes and comments for a user's profile stats bar
// Runs all three counts in parallel via Promise.all was 3 sequential queries before
export function useSupabaseUserStats(userId: string) {
  return useQuery({
    queryKey: ["user-stats", userId],
    queryFn: async () => {
      if (!userId) {
        return { totalPosts: 0, totalUpvotes: 0, totalComments: 0 };
      }

      // Run all three DB calls at the same time faster than sequential
      const [postsCountResult, upvotesResult, commentsCountResult] =
        await Promise.all([
          // Count total posts by this user
          supabase
            .from("posts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),

          // Fetch upvote values to sum them up
          supabase.from("posts").select("upvotes").eq("user_id", userId),

          // Count total comments by this user
          supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId),
        ]);

      // Sum all upvotes across the user's posts
      const totalUpvotes =
        upvotesResult.data?.reduce(
          (sum, post) => sum + (post.upvotes || 0),
          0,
        ) || 0;

      return {
        totalPosts: postsCountResult.count || 0,
        totalUpvotes,
        totalComments: commentsCountResult.count || 0,
      };
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes stats don't change every second
  });
}
