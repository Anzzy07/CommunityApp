import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

// Fetches which poll option a user voted for returns option id or null
export function useUserPollVote(pollId: string, userId: string | undefined) {
  return useQuery({
    queryKey: ["user-poll-vote", pollId, userId],
    queryFn: async () => {
      if (!userId || !pollId) return null;

      const { data, error } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", pollId)
        .eq("user_id", userId)
        .maybeSingle(); // Use maybeSingle instead of single to avoid errors

      if (error) {
        console.error("Error fetching user vote:", error);
        return null;
      }

      return data?.option_id || null;
    },
    enabled: !!userId && !!pollId,
    staleTime: 0, // Always consider data stale refetch when invalidated
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  });
}
