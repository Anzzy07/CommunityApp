import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseChallengeEntryVote(
  entryId: string,
  userId?: string,
) {
  return useQuery({
    queryKey: ["challenge-entry-vote", entryId, userId],
    queryFn: async () => {
      // console.log(
      //   "Fetching vote status for entry:",
      //   entryId,
      //   "user:",
      //   userId,
      // );

      if (!userId) {
        // console.log("No userId, returning null");
        return null;
      }

      const { data, error } = await supabase
        .from("challenge_entry_votes")
        .select("vote_type")
        .eq("entry_id", entryId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching vote:", error);
        throw error;
      }

      const voteType = data?.vote_type || null;
      // console.log(" Vote status fetched:", voteType);
      return voteType;
    },
    enabled: !!entryId && !!userId,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
