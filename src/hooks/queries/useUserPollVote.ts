import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

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
        .single();

      if (error && error.code !== "PGRST116") {
        // Ignore "no rows" error
        throw error;
      }

      return data?.option_id || null;
    },
    enabled: !!userId && !!pollId,
  });
}
