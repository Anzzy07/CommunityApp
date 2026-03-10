import { supabase } from "@/src/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Submit a challenge entry
export function useSubmitChallengeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      challengeId,
      userId,
      content,
      imageUrl,
    }: {
      challengeId: string;
      userId: string;
      content: string;
      imageUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from("challenge_entries")
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          content,
          image_url: imageUrl || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries", variables.challengeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries-count", variables.challengeId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "user-challenge-entry",
          variables.challengeId,
          variables.userId,
        ],
      });
    },
  });
}

// Update a challenge entry
export function useUpdateChallengeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      challengeId,
      userId,
      content,
      imageUrl,
    }: {
      entryId: string;
      challengeId: string;
      userId: string;
      content: string;
      imageUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from("challenge_entries")
        .update({
          content,
          image_url: imageUrl || null,
        })
        .eq("id", entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries", variables.challengeId],
      });
      queryClient.invalidateQueries({
        queryKey: [
          "user-challenge-entry",
          variables.challengeId,
          variables.userId,
        ],
      });
    },
  });
}

// Delete a challenge entry
export function useDeleteChallengeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      challengeId,
      userId,
    }: {
      entryId: string;
      challengeId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("challenge_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: async (_, variables) => {
      // Force refetch instead of just invalidating
      await queryClient.refetchQueries({
        queryKey: ["challenge-entries", variables.challengeId],
      });
      await queryClient.refetchQueries({
        queryKey: ["challenge-entries-count", variables.challengeId],
      });
      await queryClient.refetchQueries({
        queryKey: [
          "user-challenge-entry",
          variables.challengeId,
          variables.userId,
        ],
      });
    },
  });
}

// Vote on a challenge entry (upvote/downvote)
export function useVoteChallengeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      userId,
      voteType,
    }: {
      entryId: string;
      userId: string;
      voteType: "up" | "down";
    }) => {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from("challenge_entry_votes")
        .select("*")
        .eq("entry_id", entryId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        // If same vote type, remove it (un-vote)
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("challenge_entry_votes")
            .delete()
            .eq("entry_id", entryId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          // If different vote type, update it
          const { error } = await supabase
            .from("challenge_entry_votes")
            .update({ vote_type: voteType })
            .eq("entry_id", entryId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "updated", voteType };
        }
      } else {
        // No existing vote, create new one
        const { error } = await supabase.from("challenge_entry_votes").insert({
          entry_id: entryId,
          user_id: userId,
          vote_type: voteType,
        });

        if (error) throw error;
        return { action: "created", voteType };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate to refetch updated vote count
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries"],
      });
      queryClient.invalidateQueries({
        queryKey: ["challenge-entry-vote", variables.entryId, variables.userId],
      });
    },
  });
}
