import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

// Fetches all messages for a group chat with user info and reply data
export function useSupabaseGroupMessages(groupId: string) {
  return useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_messages")
        .select(
          `
          *,
          user:users!group_messages_user_id_fkey (
            id,
            username,
            full_name,
            image_url
          )
        `,
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Batch fetch all replied-to messages in one query
      const replyToIds = [
        ...new Set(
          (data || [])
            .filter((m) => m.reply_to_id)
            .map((m) => m.reply_to_id as string),
        ),
      ];

      let replyMap = new Map<
        string,
        { id: string; message: string; user_name: string }
      >();
      if (replyToIds.length > 0) {
        const { data: replyData } = await supabase
          .from("group_messages")
          .select(
            `
            id,
            message,
            user:users!group_messages_user_id_fkey (
              full_name,
              username
            )
          `,
          )
          .in("id", replyToIds);

        replyMap = new Map(
          (replyData || []).map((r: any) => [
            r.id,
            {
              id: r.id,
              message: r.message || "",
              user_name: r.user?.full_name || r.user?.username || "Unknown",
            },
          ]),
        );
      }

      const messages: GroupMessage[] = (data || []).map((msg: any) => ({
        id: msg.id,
        group_id: msg.group_id,
        user: {
          id: msg.user?.id || msg.user_id,
          name: msg.user?.full_name || msg.user?.username || "Unknown",
          image: msg.user?.image_url || null,
        },
        message: msg.message || "",
        image_url: msg.image_url || null,
        created_at: msg.created_at,
        reply_to: msg.reply_to_id
          ? replyMap.get(msg.reply_to_id) || null
          : null,
      }));

      return messages;
    },
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
}

// Real-time subscription for group chat.
//
// KEY FIX: Instead of doing an extra users fetch inside the callback
// (which could fail silently), we do a targeted invalidation + refetch
// of just the new message. This is simpler and works reliably on ALL devices.
//
// The subscription does NOT skip any user's messages — every device
// sees every new message come in via real-time. The optimistic update
// in useSendMessage handles showing YOUR OWN message instantly before
// the real-time fires, so there's no duplicate.
export function useGroupMessagesSubscription(
  groupId: string,
  onScrollToBottom: () => void,
) {
  const queryClient = useQueryClient();

  // Store the scroll callback in a ref so the channel never needs to recreate
  // just because the parent re-rendered with a new function reference
  const scrollRef = useRef(onScrollToBottom);
  useEffect(() => {
    scrollRef.current = onScrollToBottom;
  });

  useEffect(() => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-messages:${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload: any) => {
          const newMsgId = payload.new?.id;
          if (!newMsgId) return;

          // Fetch the full message with user info — single targeted query
          const { data } = await supabase
            .from("group_messages")
            .select(
              `
              id,
              group_id,
              message,
              image_url,
              created_at,
              reply_to_id,
              user_id,
              user:users!group_messages_user_id_fkey (
                id,
                full_name,
                username,
                image_url
              )
            `,
            )
            .eq("id", newMsgId)
            .single();

          if (!data) return;

          const newMessage: GroupMessage = {
            id: data.id,
            group_id: data.group_id,
            user: {
              id: (data.user as any)?.id || data.user_id,
              name:
                (data.user as any)?.full_name ||
                (data.user as any)?.username ||
                "Unknown",
              image: (data.user as any)?.image_url || null,
            },
            message: data.message || "",
            image_url: data.image_url || null,
            created_at: data.created_at,
            reply_to: null,
          };

          // Append to cache — check for duplicates first to avoid
          // showing the message twice (optimistic + real-time)
          queryClient.setQueryData(
            ["group-messages", groupId],
            (old: GroupMessage[] | undefined) => {
              const existing = old ?? [];
              // If message already exists (from optimistic update), replace it
              // with the real one. If not, append it.
              const hasOptimistic = existing.some(
                (m) =>
                  m.id.startsWith("optimistic-") &&
                  m.message === newMessage.message &&
                  m.user.id === newMessage.user.id,
              );
              if (hasOptimistic) {
                return existing.map((m) =>
                  m.id.startsWith("optimistic-") &&
                  m.message === newMessage.message &&
                  m.user.id === newMessage.user.id
                    ? newMessage
                    : m,
                );
              }
              return [...existing, newMessage];
            },
          );

          // Update the chat list last message preview
          queryClient.invalidateQueries({ queryKey: ["group-last-messages"] });

          // Scroll to the new message
          scrollRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Only recreate when groupId changes
  }, [groupId, queryClient]);
}
