import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { uploadImage } from "@/src/utils/supabaseImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Sends a message to a group chat with an optimistic insert.
// Flow:
// 1. onMutate - optimistic message with the real user name and avatar
//    appears instantly at the bottom of the chat
// 2. mutationFn — uploads image if attached, inserts into group_messages
// 3. onSuccess — invalidates chat list preview ONLY (not the message list)
// 4. Real-time subscription — replaces the optimistic placeholder with
//    the real DB row on the sender's device, and delivers it to all others

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
      // userName and userImage are used only in onMutate for the optimistic message.
      // They are NOT sent to the DB — the DB uses userId to look up the user.
      userName?: string;
      userImage?: string | null;
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

    onMutate: async ({
      groupId,
      userId,
      message,
      imageUrl,
      userName,
      userImage,
    }) => {
      // Cancel outgoing refetches so they don't overwrite the optimistic message
      await queryClient.cancelQueries({
        queryKey: ["group-messages", groupId],
      });

      const previousMessages = queryClient.getQueryData([
        "group-messages",
        groupId,
      ]);

      // Build optimistic message shown instantly before DB confirms.
      // Uses real userName and userImage so the sender sees their own name
      // and avatar straight away — not "You" with a blank avatar.
      // The "optimistic-" prefix lets the real-time subscription find
      // and replace this entry when the real message arrives.
      const optimisticMessage: GroupMessage = {
        id: `optimistic-${Date.now()}`,
        group_id: groupId,
        user: {
          id: userId,
          name: userName || "You",
          image: userImage || null,
        },
        message,
        // Show the local file URI for instant preview before the upload finishes
        image_url: imageUrl || null,
        created_at: new Date().toISOString(),
        reply_to: null,
      };

      // Append to the bottom of the chat immediately
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
      // Restore the previous message list if the send failed
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(
          ["group-messages", variables.groupId],
          context.previousMessages,
        );
      }
    },

    onSuccess: () => {
      // Only refresh the chat list last-message preview.
      // exact:false matches all keys that start with "group-last-messages"
      // regardless of the groupIds and currentUserId suffix.
      queryClient.invalidateQueries({
        queryKey: ["group-last-messages"],
        exact: false,
      });
    },
  });
}

// Marks all unread messages in a group as read for the current user.
// Called when the chat screen opens — clears the unread badge on the list.
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
      // Update messages from others that are still unread
      const { error } = await supabase
        .from("group_messages")
        .update({ is_read: true })
        .eq("group_id", groupId)
        .neq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },

    onSuccess: () => {
      // Clear the unread badge — matches all group-last-messages keys
      queryClient.invalidateQueries({
        queryKey: ["group-last-messages"],
        exact: false,
      });
    },
  });
}
