import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

// Get user's vote for a specific challenge entry
export function useSupabaseChallengeEntryVote(
  entryId: string,
  userId?: string,
) {
  return useQuery({
    queryKey: ["challenge-entry-vote", entryId, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("challenge_entry_votes")
        .select("vote_type")
        .eq("entry_id", entryId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // Ignore "not found"
      return data?.vote_type || null;
    },
    enabled: !!entryId && !!userId,
    staleTime: 0,
  });
}
