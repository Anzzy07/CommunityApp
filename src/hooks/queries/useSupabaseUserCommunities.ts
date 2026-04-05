import { supabase } from "@/src/lib/supabase";
import { Group } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all communities the user has joined for the profile communities tab.
// First gets group IDs from group_members, then fetches group details.
export function useSupabaseUserCommunities(userId: string) {
  return useQuery({
    queryKey: ["user-communities", userId],
    queryFn: async () => {
      if (!userId) return [];

      // Step 1: Get all group_ids this user is a member of
      const { data: memberships, error: membershipsError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      if (membershipsError) throw membershipsError;

      const groupIds = memberships?.map((m) => m.group_id) || [];

      // No memberships — return early to avoid an empty .in() query
      if (groupIds.length === 0) return [];

      // Step 2: Fetch the full group details for all joined groups
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);

      if (groupsError) throw groupsError;

      // Transform to typed Group objects
      const communities: Group[] = (groups || []).map((g) => ({
        id: g.id,
        name: g.name,
        image: g.image_url,
        description: g.description,
        leader_id: g.leader_id,
      }));

      return communities;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes — community memberships rarely change
  });
}
