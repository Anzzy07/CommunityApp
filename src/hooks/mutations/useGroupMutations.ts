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
    onSuccess: async (_, variables) => {
      // Refetch immediately instead of just invalidating
      await queryClient.refetchQueries({
        queryKey: ["group-members", variables.userId],
      });
      await queryClient.refetchQueries({ queryKey: ["groups"] });
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
    onSuccess: async (_, variables) => {
      // Refetch immediately instead of just invalidating
      await queryClient.refetchQueries({
        queryKey: ["group-members", variables.userId],
      });
      await queryClient.refetchQueries({ queryKey: ["groups"] });
    },
  });
}

// Create a new group
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      imageUrl,
      userId,
    }: {
      name: string;
      description?: string;
      imageUrl: string;
      userId: string;
    }) => {
      // Create the group
      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          description,
          image_url: imageUrl,
          leader_id: userId,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Auto-join the creator as a member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.id,
          user_id: userId,
        });

      if (memberError) throw memberError;

      return newGroup;
    },
    onSuccess: async (_, variables) => {
      await queryClient.refetchQueries({ queryKey: ["groups"] });
      await queryClient.refetchQueries({
        queryKey: ["group-members", variables.userId],
      });
    },
  });
}
