import { supabase } from "@/src/lib/supabase";
import { uploadImage } from "@/src/utils/supabaseImages";
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
      imageUri,
      userId,
    }: {
      name: string;
      description?: string;
      imageUri?: string;
      userId: string;
    }) => {
      console.log("🏘️ Creating group:", { name, userId });

      // Upload image using the same utility as posts/challenge entries
      let uploadedImagePath: string | null = null;
      if (imageUri) {
        try {
          uploadedImagePath = await uploadImage(imageUri);
          console.log("✅ Group image uploaded:", uploadedImagePath);
        } catch (error) {
          console.error("❌ Error uploading group image:", error);
          // Continue without image rather than failing group creation
          uploadedImagePath = null;
        }
      }

      // Get public URL from storage path (uploadImage returns a path, not a full URL)
      const imageUrl = uploadedImagePath
        ? supabase.storage.from("images").getPublicUrl(uploadedImagePath).data
            .publicUrl
        : null;

      // Create the group
      const { data: newGroup, error: groupError } = await supabase
        .from("groups")
        .insert({
          name,
          description: description || null,
          image_url: imageUrl,
          leader_id: userId,
        })
        .select()
        .single();

      if (groupError) {
        console.error("❌ Error creating group:", groupError);
        throw groupError;
      }

      // Auto-join the creator as a member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: newGroup.id,
          user_id: userId,
        });

      if (memberError) {
        console.error("❌ Error adding member:", memberError);
        throw memberError;
      }

      console.log("✅ Group created:", newGroup.id);
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
