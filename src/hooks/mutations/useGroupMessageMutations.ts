import { supabase } from "@/src/lib/supabase";
import { uploadImage } from "@/src/utils/supabaseImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      message,
      imageUrl,
      replyToId,
    }: {
      groupId: string;
      userId: string;
      message: string;
      imageUrl?: string;
      replyToId?: string;
    }) => {
      // console.log("📤 Sending message:", {
      //   groupId,
      //   userId,
      //   message,
      //   imageUrl,
      // });

      // Upload image to Supabase Storage if provided
      let storagePath: string | null = null;
      if (imageUrl) {
        try {
          // console.log("📤 Uploading image to storage...");
          storagePath = await uploadImage(imageUrl);
          // console.log("✅ Image uploaded to:", storagePath);
        } catch (error) {
          console.error("❌ Error uploading image:", error);
          throw new Error("Failed to upload image");
        }
      }

      const { data, error } = await supabase
        .from("group_messages")
        .insert({
          group_id: groupId,
          user_id: userId,
          message,
          image_url: storagePath,
          reply_to_id: replyToId || null,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error sending message:", error);
        throw error;
      }

      // console.log("✅ Message sent:", data);
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate to trigger refetch (real-time will also update)
      queryClient.invalidateQueries({
        queryKey: ["group-messages", variables.groupId],
      });
      // Also invalidate last messages
      queryClient.invalidateQueries({
        queryKey: ["group-last-messages"],
      });
    },
  });
}

export function useMarkMessagesAsRead() {
  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      // console.log("✓ Marking messages as read for group:", groupId);

      const { error } = await supabase
        .from("group_messages")
        .update({ is_read: true })
        .eq("group_id", groupId)
        .neq("user_id", userId)
        .eq("is_read", false);

      if (error) {
        console.error("❌ Error marking messages as read:", error);
        throw error;
      }

      // console.log("✅ Messages marked as read");
    },
  });
}
