import { supabase } from "@/src/lib/supabase";
import { PollOption, Post } from "@/src/types";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const PAGE_SIZE = 20;

// Returns false if user missed a day streak shows 0 if stale
function isStreakAlive(lastActiveDateStr: string | null): boolean {
  if (!lastActiveDateStr) return false;
  const lastActive = new Date(lastActiveDateStr);
  lastActive.setHours(0, 0, 0, 0);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return lastActive >= yesterday;
}

function transformPost(post: any, pollMap: Map<string, any>): Post {
  const pollData = pollMap.get(post.id as string) ?? null;

  const pollTransformed = pollData
    ? {
        id: pollData.id as string,
        post_id: pollData.post_id as string,
        question: pollData.question as string,
        created_at: (pollData.created_at as string | null) ?? null,
        // include duration and ends_at so PollListItem can check if poll has ended
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

  return {
    id: (post.id as string) ?? "",
    title: (post.title as string) ?? "Untitled",
    description: (post.description as string | null) ?? null,
    image: (post.image_url as string | null) ?? null,
    upvotes: (post.upvotes as number | null) ?? 0,
    nr_of_comments: (post.comment_count as number | null) ?? 0,
    created_at: (post.created_at as string | null) ?? null,
    streak: isStreakAlive(post.last_active_date as string | null)
      ? ((post.current_streak as number | null) ?? 0)
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
}

// Fetches an infinite scrolling feed of posts with polls and streaks included
// Real time new and deleted posts appear without pull to refresh
export function useSupabasePosts() {
  const queryClient = useQueryClient();

  // Real time new and deleted posts appear without pull to refresh
  useEffect(() => {
    const channel = supabase
      .channel("posts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "posts" },
        () => queryClient.invalidateQueries({ queryKey: ["posts"] }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useInfiniteQuery({
    queryKey: ["posts"],
    queryFn: async ({ pageParam = 0 }) => {
      // Fetch one page of posts via the view
      const { data: postsData, error: postsError } = await supabase
        .from("posts_with_details")
        .select("*")
        .order("created_at", { ascending: false })
        .range(pageParam as number, (pageParam as number) + PAGE_SIZE - 1);

      if (postsError) throw postsError;
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

      const [pollsResult, streaksResult] = await Promise.all([
        // ONE query for all polls on this page N+1 eliminated
        supabase
          .from("polls")
          .select(
            `
            id,
            post_id,
            question,
            created_at,
            duration,
            ends_at,
            poll_options (
              id,
              poll_id,
              text,
              votes_count,
              image_url
            )
          `,
          )
          .in("post_id", postIds),

        // ONE query for all streaks on this page
        supabase
          .from("user_streaks")
          .select("user_id, current_streak, last_active_date")
          .in("user_id", userIds),
      ]);

      // Build O(1) lookup maps
      const pollMap = new Map<string, any>(
        (pollsResult.data || []).map((poll) => [poll.post_id as string, poll]),
      );

      const streakMap = new Map<string, any>(
        (streaksResult.data || []).map((s) => [s.user_id as string, s]),
      );

      // Transform everything in one pass
      return postsData.map((post) => {
        const streak = streakMap.get(post.user_id as string);
        return transformPost(
          {
            ...post,
            current_streak: (streak?.current_streak as number | null) ?? 0,
            last_active_date:
              (streak?.last_active_date as string | null) ?? null,
          },
          pollMap,
        );
      });
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length === PAGE_SIZE) {
        return allPages.length * PAGE_SIZE;
      }
      return undefined;
    },
    initialPageParam: 0,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
  });
}
