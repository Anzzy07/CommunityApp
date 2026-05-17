import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Returns false if the user missed a day streak should display as 0
function isStreakAlive(lastActiveDateStr: string | null): boolean {
  if (!lastActiveDateStr) return false;
  const lastActive = new Date(lastActiveDateStr);
  lastActive.setHours(0, 0, 0, 0);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return lastActive >= yesterday;
}

// Fetches all posts made by a specific user for the profile posts tab
// Includes streak data so each post card shows the user's current streak badge
export function useSupabaseUserPosts(userId: string) {
  return useQuery({
    queryKey: ["user-posts", userId],
    queryFn: async () => {
      if (!userId) return [];

      // Fetch posts and the user's streak in parallel single round trip
      const [postsResult, streakResult] = await Promise.all([
        supabase
          .from("posts_with_details")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),

        // One streak fetch for the whole profile reused across all post cards
        supabase
          .from("user_streaks")
          .select("current_streak, last_active_date")
          .eq("user_id", userId)
          .single(),
      ]);

      if (postsResult.error) throw postsResult.error;

      // Validate streak client side so stale streaks show 0
      const streakData = streakResult.data;
      const alive = isStreakAlive(
        (streakData?.last_active_date as string | null) ?? null,
      );
      const streak = alive
        ? ((streakData?.current_streak as number | null) ?? 0)
        : 0;

      // Transform posts streak is the same value for all posts by this user
      const posts: Post[] = (postsResult.data || []).map((post: any) => ({
        id: post.id,
        title: post.title,
        description: post.description ?? null,
        image: post.image_url ?? null,
        created_at: post.created_at,
        upvotes: (post.upvotes as number | null) ?? 0,
        nr_of_comments: (post.comment_count as number | null) ?? 0,
        // Streak attached to every post so PostListItem can show the fire badge
        streak,
        user: {
          id: post.user_id,
          name: post.full_name || post.username || "Unknown",
          image: post.user_image ?? null,
        },
        group: {
          id: post.group_id,
          name: post.group_name || "Unknown",
          image: post.group_image ?? null,
        },
        poll: null,
      }));

      return posts;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2,
  });
}
