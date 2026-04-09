import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      console.log("📊 Voting on poll:", { pollId, optionId, userId });

      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .maybeSingle();

      console.log("🗳️ Existing vote:", existingVote);

      // Insert or update the vote
      if (existingVote) {
        const { error } = await supabase
          .from("poll_votes")
          .update({ option_id: optionId })
          .eq("poll_id", pollId)
          .eq("user_id", userId);
        if (error) throw error;
        console.log("✅ Vote updated");
      } else {
        const { error } = await supabase.from("poll_votes").insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: userId,
        });
        if (error) throw error;
        console.log("✅ Vote inserted");
      }

      // Wait for trigger to execute
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Get updated vote counts from poll_options
      const { data: options, error: optionsError } = await supabase
        .from("poll_options")
        .select("id, votes_count")
        .eq("poll_id", pollId);

      if (optionsError) throw optionsError;

      // Build count map
      const countMap = new Map<string, number>();
      options?.forEach((opt) => {
        countMap.set(opt.id, opt.votes_count ?? 0);
      });

      console.log("📊 Real vote counts from DB:", Object.fromEntries(countMap));

      return { success: true, optionId, countMap };
    },

    onMutate: async ({ pollId, optionId, userId }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({
        queryKey: ["user-poll-vote", pollId, userId],
      });

      // Save previous state
      const prevPosts = queryClient.getQueryData(["posts"]);
      const prevVote = queryClient.getQueryData([
        "user-poll-vote",
        pollId,
        userId,
      ]) as string | null;

      // Optimistically update user's vote
      queryClient.setQueryData(["user-poll-vote", pollId, userId], optionId);

      // Optimistically update vote counts
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
      console.error("❌ Vote failed, rolling back");
      if (context?.prevPosts) {
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
      console.log(
        "🔄 Updating cache with real counts:",
        Object.fromEntries(data.countMap),
      );

      // Update with real counts from database
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
                    votes_count: data.countMap.get(opt.id) ?? 0,
                  })),
                },
              };
            }),
          ),
        };
      });

      // ✅ CRITICAL: Also update the user vote query to ensure consistency
      queryClient.setQueryData(
        ["user-poll-vote", variables.pollId, variables.userId],
        variables.optionId,
      );
    },

    onSettled: async (_data, _err, variables) => {
      console.log("🔄 Final refetch...");

      // ✅ Force refetch both queries to ensure everything is in sync
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["posts"] }),
        queryClient.invalidateQueries({
          queryKey: ["user-poll-vote", variables.pollId, variables.userId],
        }),
      ]);

      console.log("✅ All done!");
    },
  });
}
