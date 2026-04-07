import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { uploadImage } from "@/src/utils/supabaseImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Sends a message to a group chat — optimistic insert so it appears instantly
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
      // Upload image to Supabase Storage first if one was attached
      let storagePath: string | null = null;
      if (imageUrl) {
        try {
          storagePath = await uploadImage(imageUrl);
        } catch {
          throw new Error("Failed to upload image");
        }
      }

      // Insert the message into the database
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

      if (error) throw error;
      return data;
    },

    onMutate: async ({ groupId, userId, message, imageUrl, replyToId }) => {
      // Cancel any outgoing message fetches to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: ["group-messages", groupId],
      });

      const previousMessages = queryClient.getQueryData([
        "group-messages",
        groupId,
      ]);

      // Build an optimistic message object so it appears instantly in the chat.
      // Uses a temp ID prefixed with "optimistic-" to identify it for removal later.
      // The real-time subscription skips messages from currentUser so no duplicate appears.
      const optimisticMessage: GroupMessage = {
        id: `optimistic-${Date.now()}`,
        group_id: groupId,
        user: {
          id: userId,
          name: "You", // Will be replaced when real message arrives
          image: null,
        },
        message,
        // Show local image URI for instant preview — real URL comes after upload
        image_url: imageUrl || null,
        created_at: new Date().toISOString(),
        reply_to: null,
      };

      // Add the optimistic message to the bottom of the chat immediately
      queryClient.setQueryData(
        ["group-messages", groupId],
        (old: GroupMessage[] | undefined) => [
          ...(old ?? []),
          optimisticMessage,
        ],
      );

      return { previousMessages };
    },

    onError: (_err, variables, context) => {
      // Roll back to the previous message list if sending failed
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          ["group-messages", variables.groupId],
          context.previousMessages,
        );
      }
    },

    onSuccess: (_data, variables) => {
      // The real-time subscription will append the real message from the DB.
      // We remove the optimistic message by invalidating so the real one replaces it.
      queryClient.invalidateQueries({
        queryKey: ["group-messages", variables.groupId],
      });
      // Update the chat list preview with the new last message
      queryClient.invalidateQueries({ queryKey: ["group-last-messages"] });
    },
  });
}

// Marks all unread messages in a group as read for the current user.
// Called when the user opens the group chat screen.
export function useMarkMessagesAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
    }: {
      groupId: string;
      userId: string;
    }) => {
      // Update all messages not sent by this user that are still unread
      const { error } = await supabase
        .from("group_messages")
        .update({ is_read: true })
        .eq("group_id", groupId)
        .neq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },

    onSuccess: () => {
      // Refresh the chat list so the unread badge disappears immediately
      queryClient.invalidateQueries({ queryKey: ["group-last-messages"] });
    },
  });
}
