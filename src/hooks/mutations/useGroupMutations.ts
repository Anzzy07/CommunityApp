import { supabase } from "@/src/lib/supabase";
import { GroupMember } from "@/src/types";
import { uploadImage } from "@/src/utils/supabaseImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Joins a community — optimistic update so the Join button flips instantly
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
      // Insert a new row into group_members to record this user joining
      const { error } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: userId,
      });

      if (error) throw error;
      return { success: true };
    },

    onMutate: async ({ groupId, userId }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({
        queryKey: ["group-members", userId],
      });

      // Snapshot the previous state so we can roll back if the DB call fails
      const previousMembers = queryClient.getQueryData([
        "group-members",
        userId,
      ]);

      // Instantly add this group to the user's membership list in the cache
      // This makes the Join button flip to "Joined" without waiting for the server
      queryClient.setQueryData(
        ["group-members", userId],
        (old: GroupMember[] | undefined) => [
          ...(old ?? []),
          {
            id: `optimistic-${Date.now()}`,
            group_id: groupId,
            user_id: userId,
            joined_at: new Date().toISOString(),
          } as GroupMember,
        ],
      );

      return { previousMembers };
    },

    onError: (_err, variables, context) => {
      // Roll back to the previous membership list if joining failed
      if (context?.previousMembers !== undefined) {
        queryClient.setQueryData(
          ["group-members", variables.userId],
          context.previousMembers,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      // Sync with the real DB data in the background after mutation completes
      queryClient.invalidateQueries({
        queryKey: ["group-members", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({
        queryKey: ["group-member-count"],
      });
    },
  });
}

// Leaves a community — optimistic update so the button flips instantly
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
      // Delete the row from group_members that matches this user and group
      const { error } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    },

    onMutate: async ({ groupId, userId }) => {
      await queryClient.cancelQueries({
        queryKey: ["group-members", userId],
      });

      const previousMembers = queryClient.getQueryData([
        "group-members",
        userId,
      ]);

      // Instantly remove this group from the user's membership list in the cache
      // This makes the "Joined" button flip back to "Join" without waiting for the server
      queryClient.setQueryData(
        ["group-members", userId],
        (old: GroupMember[] | undefined) =>
          (old ?? []).filter((m) => m.group_id !== groupId),
      );

      return { previousMembers };
    },

    onError: (_err, variables, context) => {
      // Roll back to the previous membership list if leaving failed
      if (context?.previousMembers !== undefined) {
        queryClient.setQueryData(
          ["group-members", variables.userId],
          context.previousMembers,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      // Sync with real DB data in background
      queryClient.invalidateQueries({
        queryKey: ["group-members", variables.userId],
      });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({
        queryKey: ["group-member-count"],
      });
    },
  });
}

// Creates a new community — uploads image, creates group, auto-joins creator
export function useCreateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      imageUri,
      userId,
    }: {
      name: string;
      description?: string;
      imageUri?: string;
      userId: string;
    }) => {
      // Upload the community image to Supabase Storage if one was provided
      let uploadedImagePath: string | null = null;
      if (imageUri) {
        try {
          uploadedImagePath = await uploadImage(imageUri);
        } catch (error) {
          // Continue without image rather than blocking group creation
          uploadedImagePath = null;
        }
      }

      // Convert the storage path to a full public URL for display
      const imageUrl = uploadedImagePath
        ? supabase.storage.from("images").getPublicUrl(uploadedImagePath).data
            .publicUrl
        : null;

      // Insert the new group into the groups table
      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          description: description || null,
          image_url: imageUrl,
          leader_id: userId, // Creator becomes the leader automatically
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Auto-join the creator as a member of their own community
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.id,
          user_id: userId,
        });

      if (memberError) throw memberError;

      return newGroup;
    },

    onSuccess: (_data, variables) => {
      // Refresh the groups list and user memberships after creation
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({
        queryKey: ["group-members", variables.userId],
      });
    },
  });
}
