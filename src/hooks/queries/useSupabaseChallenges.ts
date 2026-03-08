import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseChallenges(groupId?: string) {
  return useQuery({
    queryKey: groupId ? ["challenges", groupId] : ["challenges"],
    queryFn: async () => {
      let query = supabase
        .from("challenges")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by group if provided
      if (groupId) {
        query = query.eq("group_id", groupId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });
}
