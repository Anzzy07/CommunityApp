import { supabase } from "@/src/lib/supabase";
import { Group } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all groups with member counts using React Query
export function useSupabaseGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Transform to match your Group type
      const groupsData = (data || []).map((group) => ({
        id: group.id,
        name: group.name,
        image: group.image_url,
        leader_id: group.leader_id,
      }));

      return groupsData as Group[];
    },
    staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}
