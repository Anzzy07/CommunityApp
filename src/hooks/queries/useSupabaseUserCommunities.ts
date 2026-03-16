import { supabase } from "@/src/lib/supabase";
import { Group } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseUserCommunities(userId: string) {
  return useQuery({
    queryKey: ["user-communities", userId],
    queryFn: async () => {
      console.log("🔍 Fetching communities for user:", userId);

      if (!userId) {
        return [];
      }

      // Get all group_ids the user is a member of
      const { data: memberships, error: membershipsError } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", userId);

      if (membershipsError) {
        console.error("❌ Error fetching memberships:", membershipsError);
        throw membershipsError;
      }

      const groupIds = memberships?.map((m) => m.group_id) || [];

      if (groupIds.length === 0) {
        return [];
      }

      // Get group details
      const { data: groups, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds);

      if (groupsError) {
        console.error("❌ Error fetching groups:", groupsError);
        throw groupsError;
      }

      console.log("✅ Fetched user communities:", groups?.length || 0);

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
  });
}
