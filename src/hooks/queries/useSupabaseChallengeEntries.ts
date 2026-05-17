import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

// Fetches all entries for a specific challenge with user info joined
export function useSupabaseChallengeEntries(challengeId: string) {
  return useQuery({
    queryKey: ["challenge-entries", challengeId],
    queryFn: async () => {
      // Fetch entries with user details joined in a single query
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

      if (error) throw error;

      // Flatten the joined user object Supabase returns it as an array
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
    staleTime: 1000 * 60 * 1, // 1 minute entries change less often than posts
  });
}

// Fetches just the count of entries for a challenge used in the header badge
export function useSupabaseChallengeEntriesCount(challengeId: string) {
  return useQuery({
    queryKey: ["challenge-entries-count", challengeId],
    queryFn: async () => {
      // head true means only fetch the count not the actual rows very fast
      const { count, error } = await supabase
        .from("challenge_entries")
        .select("*", { count: "exact", head: true })
        .eq("challenge_id", challengeId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!challengeId,
    staleTime: 1000 * 60 * 1,
  });
}

// Fetches the current user's own entry for a challenge used to show Update versus Submit
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

      // PGRST116 means no rows found this is expected when user hasn't entered yet
      if (error && error.code !== "PGRST116") throw error;
      return data ?? null;
    },
    enabled: !!challengeId && !!userId,
    staleTime: 1000 * 60 * 2,
  });
}
