import { supabase } from "@/src/lib/supabase";
import { PollOption, Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

function isStreakAlive(lastActiveDateStr: string | null): boolean {
  if (!lastActiveDateStr) return false;
  const lastActive = new Date(lastActiveDateStr);
  lastActive.setHours(0, 0, 0, 0);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return lastActive >= yesterday;
}

// Fetches posts for a specific community directly from the DB.
// Replaces the old pattern of filtering the global infinite feed in JS,
// which only ever showed posts from already-loaded pages — meaning a community
// with 50 posts would show at most 20 depending on global feed state.
// This hook always returns ALL posts for the community regardless of feed state.
export function useSupabaseGroupPosts(groupId: string) {
  return useQuery({
    queryKey: ["group-posts", groupId],
    queryFn: async () => {
      if (!groupId) return [];

      const { data: postsData, error } = await supabase
        .from("posts_with_details")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!postsData || postsData.length === 0) return [] as Post[];

      const postIds = postsData
        .map((p) => p.id)
        .filter((id): id is string => typeof id === "string");

      const userIds = [
        ...new Set(
          postsData
            .map((p) => p.user_id)
            .filter((id): id is string => typeof id === "string"),
        ),
      ];

      // Fetch polls and streaks in parallel — one query each
      const [pollsResult, streaksResult] = await Promise.all([
        supabase
          .from("polls")
          .select(
            `id, post_id, question, created_at, duration, ends_at,
             poll_options ( id, poll_id, text, votes_count, image_url )`,
          )
          .in("post_id", postIds),

        supabase
          .from("user_streaks")
          .select("user_id, current_streak, last_active_date")
          .in("user_id", userIds),
      ]);

      const pollMap = new Map<string, any>(
        (pollsResult.data || []).map((poll) => [poll.post_id as string, poll]),
      );
      const streakMap = new Map<string, any>(
        (streaksResult.data || []).map((s) => [s.user_id as string, s]),
      );

      return postsData.map((post): Post => {
        const streak = streakMap.get(post.user_id as string);
        const pollData = pollMap.get(post.id as string) ?? null;

        const pollTransformed = pollData
          ? {
              id: pollData.id as string,
              post_id: pollData.post_id as string,
              question: pollData.question as string,
              created_at: (pollData.created_at as string | null) ?? null,
              duration: (pollData.duration as string | null) ?? null,
              ends_at: (pollData.ends_at as string | null) ?? null,
              options: ((pollData.poll_options as any[]) || []).map(
                (opt): PollOption => ({
                  id: opt.id as string,
                  poll_id: opt.poll_id as string,
                  text: opt.text as string,
                  votes_count: (opt.votes_count as number | null) ?? 0,
                  image_url: (opt.image_url as string | null) ?? null,
                }),
              ),
            }
          : null;

        const lastActive = (streak?.last_active_date as string | null) ?? null;

        return {
          id: (post.id as string) ?? "",
          title: (post.title as string) ?? "Untitled",
          description: (post.description as string | null) ?? null,
          image: (post.image_url as string | null) ?? null,
          upvotes: (post.upvotes as number | null) ?? 0,
          nr_of_comments: (post.comment_count as number | null) ?? 0,
          created_at: (post.created_at as string | null) ?? null,
          streak: isStreakAlive(lastActive)
            ? ((streak?.current_streak as number | null) ?? 0)
            : 0,
          user: {
            id: (post.user_id as string) ?? "",
            name:
              (post.full_name as string | null) ??
              (post.username as string | null) ??
              "Unknown",
            image: (post.user_image as string | null) ?? null,
          },
          group: {
            id: (post.group_id as string) ?? "",
            name: (post.group_name as string | null) ?? "Unknown Group",
            image: (post.group_image as string | null) ?? null,
          },
          poll: pollTransformed,
        };
      });
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  });
}

// Fetches just the total post count for a community — used to show
// non-members how active the community is so they are motivated to join.
// Much cheaper than fetching full post data just for a number.
export function useSupabaseGroupPostCount(groupId: string) {
  return useQuery({
    queryKey: ["group-post-count", groupId],
    queryFn: async () => {
      if (!groupId) return 0;
      const { count, error } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
  });
}
