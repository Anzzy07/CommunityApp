import { supabase } from "@/src/lib/supabase";
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

      // Check if user already voted
      const { data: existingVote } = await supabase
        .from("poll_votes")
        .select("*")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        // Update existing vote
        const { error } = await supabase
          .from("poll_votes")
          .update({ option_id: optionId })
          .eq("poll_id", pollId)
          .eq("user_id", userId);

        if (error) throw error;
        console.log("✅ Vote updated");
        return { action: "updated" };
      } else {
        // Create new vote
        const { error } = await supabase.from("poll_votes").insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: userId,
        });

        if (error) throw error;
        console.log("✅ Vote created");
        return { action: "created" };
      }
    },
    onSuccess: async (_, variables) => {
      // Refetch posts to get updated vote counts
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({
        queryKey: ["user-poll-vote", variables.pollId, variables.userId],
      });
    },
  });
}
