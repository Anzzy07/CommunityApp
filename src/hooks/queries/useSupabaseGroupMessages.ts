import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

// Fetches all messages for a group chat with user info and reply data.
// Uses staleTime:0 + refetchInterval as a polling fallback in case real-time
// misses a message — this guarantees Device 2 always gets new messages
// even if the Supabase subscription silently drops a payload.
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

      // Collect all reply_to_ids so we can fetch their content in one batch query
      const replyToIds = [
        ...new Set(
          (data || [])
            .filter((m) => m.reply_to_id)
            .map((m) => m.reply_to_id as string),
        ),
      ];

      // Batch fetch reply content — one query regardless of how many replies exist
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
    // staleTime 0: every navigation into this screen immediately refetches
    // so Device 2 sees new messages without waiting for real-time
    staleTime: 0,
    gcTime: 1000 * 60 * 10,
    // Polling fallback: refetch every 3 seconds while the screen is open.
    // This guarantees messages appear even if the Supabase real-time
    // subscription silently drops a payload — belt-and-suspenders approach.
    // Real-time still handles instant delivery; polling is the safety net.
    refetchInterval: 3000,
    // Only poll when the app is in the foreground — stop when user switches apps
    refetchIntervalInBackground: false,
  });
}

// Real-time subscription for group chat messages.
//
// Strategy:
// 1. Listen for INSERT events on group_messages for this specific groupId
// 2. Fetch the full new message with user info via a targeted query by id
// 3. Append it to the React Query cache — no full list refetch needed
// 4. Deduplicate against any optimistic placeholder from useSendMessage
// 5. Call onScrollToBottom so the new message is always visible
//
// The scrollRef pattern ensures the Supabase channel is only created ONCE
// per groupId — the closure captures scrollRef.current, not the function itself,
// so re-renders never cause the subscription to restart.
export function useGroupMessagesSubscription(
  groupId: string,
  onScrollToBottom: () => void,
) {
  const queryClient = useQueryClient();

  // Store the latest scroll callback in a ref so the subscription closure
  // always calls the most recent version without recreating the channel
  const scrollRef = useRef(onScrollToBottom);
  useEffect(() => {
    scrollRef.current = onScrollToBottom;
  });

  useEffect(() => {
    if (!groupId) return;

    // Use the exact same cache key format as useSupabaseGroupMessages
    // so setQueryData always targets the correct cache entry
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
          const newMsgId = payload.new?.id;
          if (!newMsgId) return;

          // Fetch the full message with joined user data.
          // payload.new only contains the raw DB row without user info,
          // so we need this extra query to get the sender's name and avatar.
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
            // Reply content not critical for real-time delivery —
            // the 3-second polling refetch will fill it in shortly
            reply_to: null,
          };

          // Update cache — three possible cases:
          // A) Replace the optimistic placeholder (sender's device)
          // B) Skip if already added by the 3s polling refetch (exact id match)
          // C) Append as a new message (receiver's device, normal case)
          queryClient.setQueryData(
            cacheKey,
            (old: GroupMessage[] | undefined) => {
              const existing = old ?? [];

              // Case A: find and replace optimistic placeholder.
              // Matched by: temp id prefix + same message text + same sender id
              const optimisticIndex = existing.findIndex(
                (m) =>
                  m.id.startsWith("optimistic-") &&
                  m.message === newMessage.message &&
                  m.user.id === newMessage.user.id,
              );

              if (optimisticIndex !== -1) {
                // Replace in-place to preserve list order
                const updated = [...existing];
                updated[optimisticIndex] = newMessage;
                return updated;
              }

              // Case B: exact duplicate — real-time fired after polling already added it
              if (existing.some((m) => m.id === newMessage.id)) {
                return existing;
              }

              // Case C: genuinely new message from another user — append to bottom
              return [...existing, newMessage];
            },
          );

          // Refresh the chat list last-message preview and unread count
          queryClient.invalidateQueries({
            queryKey: ["group-last-messages"],
          });

          // Scroll to bottom so the new message is visible immediately
          scrollRef.current();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // Only recreate the channel when groupId changes — not on every render
  }, [groupId, queryClient]);
}
