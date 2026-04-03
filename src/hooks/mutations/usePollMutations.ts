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
      const { data: existingVote } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        const { error } = await supabase
          .from("poll_votes")
          .update({ option_id: optionId })
          .eq("poll_id", pollId)
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("poll_votes").insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: userId,
        });
        if (error) throw error;
      }

      // No setTimeout — optimistic update handles the UI instantly
      return { success: true, optionId };
    },

    onMutate: async ({ pollId, optionId, userId }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });

      const prevPosts = queryClient.getQueryData(["posts"]);
      const prevVote = queryClient.getQueryData([
        "user-poll-vote",
        pollId,
        userId,
      ]) as string | null;

      // Update poll vote counts in the feed instantly
      queryClient.setQueryData(["posts"], (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: Post[]) =>
            page.map((post) => {
              if (!post.poll || post.poll.id !== pollId) return post;
              return {
                ...post,
                poll: {
                  ...post.poll,
                  options: post.poll.options.map((opt) => {
                    if (opt.id === optionId) {
                      // Add vote to newly selected option
                      return { ...opt, votes_count: opt.votes_count + 1 };
                    }
                    if (opt.id === prevVote) {
                      // Remove vote from previously selected option
                      return {
                        ...opt,
                        votes_count: Math.max(0, opt.votes_count - 1),
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

      // Also update the detail page poll if it's open
      queryClient.setQueryData(["post", pollId], (old: any) => {
        if (!old?.post?.poll) return old;
        return {
          ...old,
          post: {
            ...old.post,
            poll: {
              ...old.post.poll,
              options: old.post.poll.options.map((opt: any) => {
                if (opt.id === optionId) {
                  return { ...opt, votes_count: opt.votes_count + 1 };
                }
                if (opt.id === prevVote) {
                  return {
                    ...opt,
                    votes_count: Math.max(0, opt.votes_count - 1),
                  };
                }
                return opt;
              }),
            },
          },
        };
      });

      // Update the user's selected option immediately
      queryClient.setQueryData(["user-poll-vote", pollId, userId], optionId);

      return { prevPosts, prevVote };
    },

    onError: (_err, variables, context) => {
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

    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({
        queryKey: ["user-poll-vote", variables.pollId, variables.userId],
      });
    },
  });
}
