import { supabase } from "@/src/lib/supabase";
import { uploadImage } from "@/src/utils/supabaseImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Submits a new entry for a challenge uploads image first if provided
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
      // Upload the entry image to Supabase Storage if one was selected
      let storagePath: string | null = null;
      if (imageUrl) {
        try {
          storagePath = await uploadImage(imageUrl);
        } catch (error) {
          throw new Error("Failed to upload image");
        }
      }

      // Insert the challenge entry into the database
      const { data, error } = await supabase
        .from("challenge_entries")
        .insert({
          challenge_id: challengeId,
          user_id: userId,
          content,
          image_url: storagePath,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (_data, variables) => {
      // Refresh entries list, count, and user's own entry after submission
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

// Updates an existing challenge entry replaces content and image
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
      // Upload new image if one was selected
      let storagePath: string | null = null;
      if (imageUrl) {
        try {
          storagePath = await uploadImage(imageUrl);
        } catch (error) {
          throw new Error("Failed to upload image");
        }
      }

      // Update the entry row with new content and image
      const { data, error } = await supabase
        .from("challenge_entries")
        .update({ content, image_url: storagePath })
        .eq("id", entryId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (_data, variables) => {
      // Refresh entries and user's entry after update
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

// Deletes a challenge entry verifies ownership before deleting
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
      // Verify the entry exists and belongs to this user before deleting
      const { data: existingEntry, error: checkError } = await supabase
        .from("challenge_entries")
        .select("*")
        .eq("id", entryId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existingEntry) {
        throw new Error(
          "Entry not found or you don't have permission to delete it",
        );
      }

      // Delete the entry from the database
      const { error, count } = await supabase
        .from("challenge_entries")
        .delete({ count: "exact" })
        .eq("id", entryId)
        .eq("user_id", userId);

      if (error) throw error;
      if (count === 0) throw new Error("Failed to delete entry");

      return { success: true };
    },

    onMutate: async ({ entryId, challengeId }) => {
      await queryClient.cancelQueries({
        queryKey: ["challenge-entries", challengeId],
      });

      const previousEntries = queryClient.getQueryData([
        "challenge-entries",
        challengeId,
      ]);

      // Remove the entry from the list instantly delete feels immediate
      queryClient.setQueryData(
        ["challenge-entries", challengeId],
        (old: any[]) => (old ?? []).filter((e) => e.id !== entryId),
      );

      return { previousEntries };
    },

    onError: (_err, variables, context) => {
      // Roll back if delete failed
      if (context?.previousEntries !== undefined) {
        queryClient.setQueryData(
          ["challenge-entries", variables.challengeId],
          context.previousEntries,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      // Sync with DB in background
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries", variables.challengeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries-count", variables.challengeId],
      });
    },
  });
}

// Votes on a challenge entry optimistic update no setTimeout delay
export function useVoteChallengeEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entryId,
      userId,
      voteType,
      challengeId,
    }: {
      entryId: string;
      userId: string;
      voteType: "up" | "down";
      challengeId: string;
    }) => {
      // Check if user has already voted on this entry
      const { data: existingVote } = await supabase
        .from("challenge_entry_votes")
        .select("vote_type")
        .eq("entry_id", entryId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Same vote type remove the vote un vote
          const { error } = await supabase
            .from("challenge_entry_votes")
            .delete()
            .eq("entry_id", entryId)
            .eq("user_id", userId);
          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          // Different vote switch from one type to the other
          const { error } = await supabase
            .from("challenge_entry_votes")
            .update({ vote_type: voteType })
            .eq("entry_id", entryId)
            .eq("user_id", userId);
          if (error) throw error;
          return { action: "updated", voteType };
        }
      } else {
        // No existing vote create a new one
        const { error } = await supabase
          .from("challenge_entry_votes")
          .insert({ entry_id: entryId, user_id: userId, vote_type: voteType });
        if (error) throw error;
        return { action: "created", voteType };
      }
    },

    onMutate: async ({ entryId, userId, voteType, challengeId }) => {
      await queryClient.cancelQueries({
        queryKey: ["challenge-entries", challengeId],
      });

      const previousEntries = queryClient.getQueryData([
        "challenge-entries",
        challengeId,
      ]);

      const prevVote = queryClient.getQueryData([
        "challenge-entry-vote",
        entryId,
        userId,
      ]) as "up" | "down" | null;

      // Calculate vote delta for the upvote count display
      let delta = 0;
      if (voteType === "up") {
        delta = prevVote === "up" ? -1 : prevVote === "down" ? 2 : 1;
      } else {
        delta = prevVote === "down" ? 1 : prevVote === "up" ? -2 : -1;
      }

      const newVote: "up" | "down" | null =
        prevVote === voteType ? null : voteType;

      // Update vote status immediately in cache icon changes instantly
      queryClient.setQueryData(
        ["challenge-entry-vote", entryId, userId],
        newVote,
      );

      // Update vote count in the entries list instantly no delay needed
      queryClient.setQueryData(
        ["challenge-entries", challengeId],
        (old: any[]) =>
          (old ?? []).map((entry) =>
            entry.id === entryId
              ? { ...entry, votes: (entry.votes ?? 0) + delta }
              : entry,
          ),
      );

      return { previousEntries, prevVote };
    },

    onError: (_err, variables, context) => {
      // Roll back vote status and entry list on error
      if (context?.previousEntries !== undefined) {
        queryClient.setQueryData(
          ["challenge-entries", variables.challengeId],
          context.previousEntries,
        );
      }
      if (context?.prevVote !== undefined) {
        queryClient.setQueryData(
          ["challenge-entry-vote", variables.entryId, variables.userId],
          context.prevVote,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      // Sync with real DB data in background no setTimeout needed
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries", variables.challengeId],
      });
      queryClient.invalidateQueries({
        queryKey: ["challenge-entry-vote", variables.entryId, variables.userId],
      });
    },
  });
}
