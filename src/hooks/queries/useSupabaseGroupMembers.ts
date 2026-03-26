import { supabase } from "@/src/lib/supabase";
import { GroupMember } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseGroupMembers(userId: string) {
  return useQuery({
    queryKey: ["group-members", userId],
    queryFn: async () => {
      // console.log("Fetching group members for user:", userId);

      if (!userId) {
        // console.log("No userId provided");
        return [];
      }

      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Error fetching group members:", error);
        throw error;
      }

      // console.log("Fetched group members:", data);

      const members: GroupMember[] = (data || []).map((m) => ({
        id: m.id,
        group_id: m.group_id,
        user_id: m.user_id,
        joined_at: m.joined_at,
      }));

      return members;
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 0,
  });
}

// Group Memeber Counts in community
export function useSupabaseGroupMemberCount(groupId: string) {
  return useQuery({
    queryKey: ["group-member-count", groupId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("group_members")
        .select("*", { count: "exact", head: true })
        .eq("group_id", groupId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!groupId,
  });
}
