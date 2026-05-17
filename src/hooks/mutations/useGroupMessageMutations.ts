import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { uploadImage } from "@/src/utils/supabaseImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Sends a message to a group chat.
//
// Flow:
// 1. onMutate — optimistic message added instantly to cache (sender sees it immediately)
// 2. mutationFn — uploads image if needed, inserts message into Supabase
// 3. onSuccess — only updates chat list preview (does NOT refetch messages)
// 4. Real-time subscription — replaces the optimistic message with the real one
//    on the sender's device AND delivers it to all other devices
//
// Why we don't invalidate ["group-messages"] in onSuccess:
// The real-time subscription already handles replacing the optimistic placeholder.
// Invalidating here would cause a full refetch that races with the real-time append,
// causing a visible flicker or duplicate messages.
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

      // Insert the message row into the database
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

    onMutate: async ({ groupId, userId, message, imageUrl }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic message
      await queryClient.cancelQueries({
        queryKey: ["group-messages", groupId],
      });

      // Save the current message list so we can roll back if the send fails
      const previousMessages = queryClient.getQueryData([
        "group-messages",
        groupId,
      ]);

      // Build a temporary message object that appears instantly in the chat.
      // The id starts with "optimistic-" so the real-time subscription can
      // identify and replace it when the real message arrives from Supabase.
      const optimisticMessage: GroupMessage = {
        id: `optimistic-${Date.now()}`,
        group_id: groupId,
        user: {
          id: userId,
          // "You" is shown briefly before the real-time message replaces it
          name: "You",
          image: null,
        },
        message,
        // Show the local file URI for instant image preview —
        // the real storage URL arrives after upload completes
        image_url: imageUrl || null,
        created_at: new Date().toISOString(),
        reply_to: null,
      };

      // Append optimistic message to the bottom of the chat instantly
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
      // Something went wrong — restore the message list to before the failed send
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          ["group-messages", variables.groupId],
          context.previousMessages,
        );
      }
    },

    onSuccess: (_data, _variables) => {
      // DO NOT invalidate ["group-messages"] here.
      // The real-time subscription handles replacing the optimistic placeholder
      // with the real message. Invalidating would cause an unnecessary full refetch
      // that creates a flicker on the sender's screen.
      //
      // Only update the chat list last-message preview so other screens
      // show the correct latest message without opening the chat.
      queryClient.invalidateQueries({ queryKey: ["group-last-messages"] });
    },
  });
}

// Marks all unread messages in a group as read for the current user.
// Called when the user opens the group chat screen so the unread badge clears.
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
      // Update all messages in this group that:
      // were NOT sent by the current user
      // are still marked as unread
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
