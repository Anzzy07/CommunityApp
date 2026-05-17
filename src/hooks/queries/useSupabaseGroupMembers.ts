import { supabase } from "@/src/lib/supabase";
import { GroupMember } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all groups the current user is a member of
// Used throughout the app to check join status and show correct buttons
export function useSupabaseGroupMembers(userId: string) {
  return useQuery({
    queryKey: ["group-members", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const members: GroupMember[] = (data || []).map((m) => ({
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        joined_at: m.joined_at,
      }));

      return members;
    },
    enabled: !!userId,
    // 2 minutes optimistic updates in join leave keep UI accurate between refetches
    // Was staleTime 0 before which caused a refetch on every screen visit
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 5,
  });
}

// Fetches the total member count for a specific group used on community detail screen
export function useSupabaseGroupMemberCount(groupId: string) {
  return useQuery({
    queryKey: ["group-member-count", groupId],
    queryFn: async () => {
      // head true means only fetch the count not the actual rows very fast
      const { count, error } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 2,
  });
}
