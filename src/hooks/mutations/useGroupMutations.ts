import { supabase } from "@/src/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Join a group
export function useJoinGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
      });

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      // Invalidate group members query to refetch
      queryClient.invalidateQueries({
        queryKey: ["group-members", variables.userId],
      });
      // Also invalidate groups to update member counts if needed
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}

// Leave a group
export function useLeaveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: (_, variables) => {
      // Invalidate group members query to refetch
      queryClient.invalidateQueries({
        queryKey: ["group-members", variables.userId],
      });
      // Also invalidate groups to update member counts if needed
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
