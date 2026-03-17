import { supabase } from "@/src/lib/supabase";
import { uploadImage } from "@/src/utils/supabaseImages";
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
      console.log("📤 Submitting challenge entry:", {
        challengeId,
        userId,
        imageUrl,
      });

      // Upload image to Supabase Storage if provided
      let storagePath: string | null = null;
      if (imageUrl) {
        try {
          console.log("📤 Uploading image to storage...");
          storagePath = await uploadImage(imageUrl);
          console.log("✅ Image uploaded to:", storagePath);
        } catch (error) {
          console.error("❌ Error uploading image:", error);
          throw new Error("Failed to upload image");
        }
      }

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
      console.log("✅ Challenge entry submitted");
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
      console.log("📤 Updating challenge entry:", { entryId, imageUrl });

      // Upload image to Supabase Storage if provided
      let storagePath: string | null = null;
      if (imageUrl) {
        try {
          console.log("📤 Uploading image to storage...");
          storagePath = await uploadImage(imageUrl);
          console.log("✅ Image uploaded to:", storagePath);
        } catch (error) {
          console.error("❌ Error uploading image:", error);
          throw new Error("Failed to upload image");
        }
      }

      const { data, error } = await supabase
        .from("challenge_entries")
        .update({
          content,
          image_url: storagePath,
        })
        .eq("id", entryId)
        .select()
        .single();

      if (error) throw error;
      console.log("✅ Challenge entry updated");
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
      // First verify the entry exists and belongs to user
      const { data: existingEntry, error: checkError } = await supabase
        .from("challenge_entries")
        .select("*")
        .eq("id", entryId)
        .eq("user_id", userId)
        .single();

      if (checkError || !existingEntry) {
        console.error("Entry not found or not owned by user");
        throw new Error(
          "Entry not found or you don't have permission to delete it",
        );
      }

      // Now delete
      const { error, count } = await supabase
        .from("challenge_entries")
        .delete({ count: "exact" })
        .eq("id", entryId)
        .eq("user_id", userId);

      if (error) {
        console.error("DELETE error:", error);
        throw error;
      }

      if (count === 0) {
        console.error("No rows deleted");
        throw new Error("Failed to delete entry");
      }

      return { success: true, deletedCount: count };
    },
    onSuccess: async (result, variables) => {
      // Remove from cache immediately
      queryClient.setQueryData(
        ["challenge-entries", variables.challengeId],
        (old: any) => {
          if (!old) return old;
          return old.filter((entry: any) => entry.id !== variables.entryId);
        },
      );

      // Then refetch to be sure
      await queryClient.invalidateQueries({
        queryKey: ["challenge-entries", variables.challengeId],
      });

      await queryClient.invalidateQueries({
        queryKey: ["challenge-entries-count", variables.challengeId],
      });

      await queryClient.refetchQueries({
        queryKey: ["challenge-entries", variables.challengeId],
        type: "active",
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
      const { data: existingVote, error: fetchError } = await supabase
        .from("challenge_entry_votes")
        .select("*")
        .eq("entry_id", entryId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("challenge_entry_votes")
            .delete()
            .eq("entry_id", entryId)
            .eq("user_id", userId);

          if (error) {
            console.error("Delete error:", error);
            throw error;
          }
          return { action: "removed", voteType: null, entryId };
        } else {
          const { error } = await supabase
            .from("challenge_entry_votes")
            .update({ vote_type: voteType })
            .eq("entry_id", entryId)
            .eq("user_id", userId);

          if (error) {
            console.error("Update error:", error);
            throw error;
          }
          return { action: "updated", voteType, entryId };
        }
      } else {
        const { error } = await supabase.from("challenge_entry_votes").insert({
          entry_id: entryId,
          user_id: userId,
          vote_type: voteType,
        });

        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
        return { action: "created", voteType, entryId };
      }
    },
    onSuccess: async (result, variables) => {
      // Get the challenge_id
      const { data: entryData } = await supabase
        .from("challenge_entries")
        .select("challenge_id")
        .eq("id", variables.entryId)
        .single();

      const challengeId = entryData?.challenge_id;

      if (!challengeId) {
        console.error("Could not find challenge_id");
        return;
      }

      // Update the vote status in cache immediately
      queryClient.setQueryData(
        ["challenge-entry-vote", variables.entryId, variables.userId],
        result.voteType,
      );

      // Waiting for trigger to update vote count
      await new Promise((resolve) => setTimeout(resolve, 500));

      // ONLY refetch entries for vote counts not the vote status
      queryClient.invalidateQueries({
        queryKey: ["challenge-entries", challengeId],
      });

      await queryClient.refetchQueries({
        queryKey: ["challenge-entries", challengeId],
        exact: true,
        type: "active",
      });
    },
  });
}
