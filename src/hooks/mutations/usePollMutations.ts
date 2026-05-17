import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Votes on a poll option handles switching votes and shows real counts from poll_votes table
export function usePollVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pollId,
      optionId,
      userId,
    }: {
      pollId: string;
      optionId: string;
      userId: string;
    }) => {
      // Check if user has already voted on this poll
      const { data: existingVote } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .maybeSingle();

      if (existingVote) {
        // Switch vote to new option
        const { error } = await supabase
          .from("poll_votes")
          .update({ option_id: optionId })
          .eq("poll_id", pollId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        // First vote insert new row
        const { error } = await supabase.from("poll_votes").insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: userId,
        });
        if (error) throw error;
      }

      // Fetch real counts directly from poll_votes table NOT from poll_options
      // poll_options.votes_count is updated by the DB trigger AFTER the insert
      // so reading it immediately gives stale data poll_votes is always accurate
      const { data: voteCounts, error: countError } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", pollId);

      if (countError) throw countError;

      // Count votes per option in JS simple and reliable
      const countMap = new Map<string, number>();
      for (const row of voteCounts || []) {
        const id = row.option_id as string;
        countMap.set(id, (countMap.get(id) ?? 0) + 1);
      }

      return { success: true, optionId, countMap };
    },

    onMutate: async ({ pollId, optionId, userId }) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({
        queryKey: ["user-poll-vote", pollId, userId],
      });

      const prevPosts = queryClient.getQueryData(["posts"]);
      const prevVote = (queryClient.getQueryData([
        "user-poll-vote",
        pollId,
        userId,
      ]) ?? null) as string | null;

      // Show vote selection instantly makes hasVoted true and shows progress bars
      queryClient.setQueryData(["user-poll-vote", pollId, userId], optionId);

      // Optimistically update vote counts in feed while real counts load
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: Post[]) =>
            page.map((post: Post) => {
              if (!post.poll || post.poll.id !== pollId) return post;
              return {
                ...post,
                poll: {
                  ...post.poll,
                  options: post.poll.options.map((opt) => {
                    if (opt.id === optionId) {
                      return {
                        ...opt,
                        votes_count: (opt.votes_count ?? 0) + 1,
                      };
                    }
                    if (opt.id === prevVote) {
                      // Remove vote from previously selected option
                      return {
                        ...opt,
                        votes_count: Math.max(0, (opt.votes_count ?? 0) - 1),
                      };
                    }
                    return opt;
                  }),
                },
              };
            }),
          ),
        };
      });

      return { prevPosts, prevVote };
    },

    onError: (_err, variables, context) => {
      // Roll back everything on failure
      if (context?.prevPosts !== undefined) {
        queryClient.setQueryData(["posts"], context.prevPosts);
      }
      if (context?.prevVote !== undefined) {
        queryClient.setQueryData(
          ["user-poll-vote", variables.pollId, variables.userId],
          context.prevVote,
        );
      }
    },

    onSuccess: (data, variables) => {
      // Replace optimistic counts with REAL counts from poll_votes table
      // This is the key fix we bypass poll_options.votes_count entirely
      // so the DB trigger race condition cannot affect the UI
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: Post[]) =>
            page.map((post: Post) => {
              if (!post.poll || post.poll.id !== variables.pollId) return post;
              return {
                ...post,
                poll: {
                  ...post.poll,
                  options: post.poll.options.map((opt) => ({
                    ...opt,
                    // Use real count 0 if this option has no votes yet
                    votes_count: data.countMap.get(opt.id) ?? 0,
                  })),
                },
              };
            }),
          ),
        };
      });

      // Keep user vote status in sync
      queryClient.setQueryData(
        ["user-poll-vote", variables.pollId, variables.userId],
        variables.optionId,
      );
    },

    onSettled: (_data, _err, variables) => {
      // Do NOT await this just fire and forget
      // The previous version awaited invalidation which caused the UI to
      // refetch and overwrite correct counts with stale DB trigger data
      // Now we invalidate lazily it only refetches when the component
      // next mounts or regains focus by which time the trigger has run
      queryClient.invalidateQueries({
        queryKey: ["user-poll-vote", variables.pollId, variables.userId],
      });
      // Do NOT invalidate posts here onSuccess already set accurate counts
      // Invalidating posts would cause a refetch that may return stale trigger data
    },
  });
}
