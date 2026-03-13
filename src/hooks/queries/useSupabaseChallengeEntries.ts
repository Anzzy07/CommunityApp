import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseChallengeEntries(challengeId: string) {
  return useQuery({
    queryKey: ["challenge-entries", challengeId],
    queryFn: async () => {
      // console.log("Fetching challenge entries for:", challengeId);

      const { data, error } = await supabase
        .from("challenge_entries")
        .select(
          `
          *,
          user:users!user_id (
            id,
            username,
            full_name,
            image_url
          )
        `,
        )
        .eq("challenge_id", challengeId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(":( Error fetching entries:", error);
        throw error;
      }

      // console.log(":) Fetched entries count:", data?.length || 0);

      return (data || []).map((entry: any) => {
        const userData = Array.isArray(entry.user) ? entry.user[0] : entry.user;

        return {
          ...entry,
          user: {
            id: userData?.id || entry.user_id,
            name: userData?.full_name || userData?.username || "Unknown",
            image: userData?.image_url || null,
          },
        };
      });
    },
    enabled: !!challengeId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}

// Get entries count for a challenge
export function useSupabaseChallengeEntriesCount(challengeId: string) {
  return useQuery({
    queryKey: ["challenge-entries-count", challengeId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("challenge_entries")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", challengeId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!challengeId,
    staleTime: 0,
    gcTime: 0,
  });
}

// Get users entry for a specific challenge
export function useSupabaseUserChallengeEntry(
  challengeId: string,
  userId?: string,
) {
  return useQuery({
    queryKey: ["user-challenge-entry", challengeId, userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("challenge_entries")
        .select("*")
        .eq("challenge_id", challengeId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error; // Ignore "not found"
      return data;
    },
    enabled: !!challengeId && !!userId,
    staleTime: 0,
    gcTime: 0,
  });
}
