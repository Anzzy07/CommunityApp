import { supabase } from "@/src/lib/supabase";
import { GroupMember } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all group memberships for the current user
export function useSupabaseGroupMembers(userId: string) {
  return useQuery({
    queryKey: ["group-members", userId],
    queryFn: async () => {
      // console.log(" Fetching group members for user:", userId);

      const { data, error } = await supabase
        .from("group_members")
        .select("*")
        .eq("user_id", userId); // Only get THIS user's memberships

      if (error) {
        console.error("Error fetching group members:", error);
        throw error;
      }

      // console.log(" Fetched group members:", data?.length || 0);
      return (data || []) as GroupMember[];
    },
    enabled: !!userId,
    staleTime: 0, // Always refetch to get latest data
    gcTime: 0, // Don't cache
  });
}
