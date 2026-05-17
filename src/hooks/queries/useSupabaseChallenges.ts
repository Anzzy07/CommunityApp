import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

// Fetches challenges from Supabase
// If groupId is provided fetches only that community's challenges
// If no groupId fetches all challenges used on the challenge detail screen
export function useSupabaseChallenges(groupId?: string) {
  return useQuery({
    queryKey: groupId ? ["challenges", groupId] : ["challenges"],
    queryFn: async () => {
      let query = supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter to a specific community's challenges if groupId is provided
      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes challenges don't change often
  });
}
