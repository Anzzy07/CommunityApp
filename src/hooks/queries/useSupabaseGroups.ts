import { supabase } from "@/src/lib/supabase";
import { Group } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all communities with member counts — used on the communities list screen
export function useSupabaseGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("groups")
        .select(
          `
          *,
          group_members(count)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((group) => ({
        id: group.id,
        name: group.name,
        image: group.image_url,
        leader_id: group.leader_id,
        description: group.description,
        member_count: group.group_members?.[0]?.count || 0,
      })) as Group[];
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

// Fetches a single community by ID — used on the community detail screen.
// Replaces the old pattern of useSupabaseGroups() + groups.find(g => g.id === id)
// which loaded every community just to render one screen.
export function useSupabaseGroup(groupId: string) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      if (!groupId) return null;

      const { data, error } = await supabase
        .from("groups")
        .select("*, group_members(count)")
        .eq("id", groupId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        image: data.image_url,
        leader_id: data.leader_id,
        description: data.description,
        member_count: data.group_members?.[0]?.count || 0,
      } as Group;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
  });
}
