import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

// Fetches all messages for a group chat with user info and reply data.
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

      // Collect all reply_to_ids to batch fetch their content in one query
      const replyToIds = [
        ...new Set(
          (data || [])
            .filter((m) => m.reply_to_id)
            .map((m) => m.reply_to_id as string),
        ),
      ];

      // One batch query for all reply content — no N+1
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

      // Transform raw DB rows into typed GroupMessage objects
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
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
  });
}

// Real-time subscription for group chat messages.
//
// Accepts currentUserId so we know whether to scroll when a message arrives —
// the sender already scrolled in handleSend, so we only scroll on Device 2.
//
// Uses payload.new directly instead of a follow-up .select() query.
// The old approach did an extra query inside the callback which could fail
// silently if the Supabase session was not available (Clerk auth setup).
// Instead we read user info from the existing cache first (free, instant).
// Only if the sender is completely new do we do one lightweight users query.
//
// The scrollRef pattern ensures the channel is only created ONCE per groupId.
// Re-renders never restart the subscription.
export function useGroupMessagesSubscription(
  groupId: string,
  currentUserId: string | undefined,
  onScrollToBottom: () => void,
) {
  const queryClient = useQueryClient();

  // Store the latest scroll callback in a ref so the subscription closure
  // always calls the current version without recreating the channel
  const scrollRef = useRef(onScrollToBottom);
  useEffect(() => {
    scrollRef.current = onScrollToBottom;
  });

  useEffect(() => {
    if (!groupId) return;

    const cacheKey = ["group-messages", groupId];

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
          const raw = payload.new;
          if (!raw?.id) return;

          // Step 1: look up sender from existing cache — no network call needed
          const cached =
            queryClient.getQueryData<GroupMessage[]>(cacheKey) ?? [];
          const cachedUser = cached.find(
            (m) => m.user.id === raw.user_id,
          )?.user;

          let userInfo = cachedUser;

          // Step 2: only if not in cache, fetch from users table (RLS disabled)
          if (!userInfo) {
            const { data: userData } = await supabase
              .from("users")
              .select("id, full_name, username, image_url")
              .eq("id", raw.user_id)
              .single();

            if (userData) {
              userInfo = {
                id: userData.id,
                name: userData.full_name || userData.username || "Unknown",
                image: userData.image_url || null,
              };
            }
          }

          const newMessage: GroupMessage = {
            id: raw.id,
            group_id: raw.group_id,
            user: userInfo ?? {
              id: raw.user_id,
              name: "Unknown",
              image: null,
            },
            message: raw.message || "",
            image_url: raw.image_url || null,
            created_at: raw.created_at,
            reply_to: null,
          };

          // Update cache — three cases:
          // A) Replace optimistic placeholder (sender's device)
          // B) Skip exact duplicate (safety net)
          // C) Append new message (receiver's device — the normal cross-device case)
          queryClient.setQueryData(
            cacheKey,
            (old: GroupMessage[] | undefined) => {
              const existing = old ?? [];

              // Case A: find optimistic placeholder by temp id + message text + sender
              const optimisticIndex = existing.findIndex(
                (m) =>
                  m.id.startsWith("optimistic-") &&
                  m.message === newMessage.message &&
                  m.user.id === newMessage.user.id,
              );
              if (optimisticIndex !== -1) {
                const updated = [...existing];
                updated[optimisticIndex] = newMessage;
                return updated;
              }

              // Case B: already exists — prevent duplicate
              if (existing.some((m) => m.id === newMessage.id)) {
                return existing;
              }

              // Case C: new message from another user — append to bottom
              return [...existing, newMessage];
            },
          );

          // Update the chat list last message preview and unread badge.
          // Use exact query key so invalidation actually hits the right cache entry.
          queryClient.invalidateQueries({
            queryKey: ["group-last-messages"],
            exact: false,
          });

          // Only scroll for the receiver — sender already scrolled in handleSend
          if (raw.user_id !== currentUserId) {
            scrollRef.current();
          }
        },
      )
      .subscribe((status, err) => {
        if (__DEV__) {
          console.log(`[Chat:${groupId}] Status:`, status, err ?? "");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // Only recreate when groupId or currentUserId changes
  }, [groupId, currentUserId, queryClient]);
}
