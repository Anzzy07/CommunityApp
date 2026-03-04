import { supabase } from "@/src/lib/supabase";
import { GroupMember } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all group memberships for the current user using React Query
export function useSupabaseGroupMembers(userId: string) {
  return useQuery({
    queryKey: ["group-members", userId],
    queryFn: async () => {
      const { data, error: fetchError } = await supabase
        .from("group_members")
        .select("*");

      if (fetchError) throw fetchError;

      return (data || []) as GroupMember[];
    },
    enabled: !!userId, // Only fetch if userId exists
    staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
  });
}
