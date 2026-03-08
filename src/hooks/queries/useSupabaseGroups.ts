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
        .select(
          `
          *,
          group_members(count)
        `,
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Transform to match your Group type with member count
      const groupsData = (data || []).map((group) => ({
        id: group.id,
        name: group.name,
        image: group.image_url,
        leader_id: group.leader_id,
        description: group.description,
        member_count: group.group_members?.[0]?.count || 0,
      }));

      return groupsData as Group[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}
