import { supabase } from "@/src/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

// Fetches the last message and unread count for each of the user's groups.
export function useSupabaseGroupLastMessages(
  groupIds: string[],
  currentUserId?: string,
) {
  const queryClient = useQueryClient();

  // Keep the exact current query key in a ref so the real-time callback
  // always targets the right cache entry even after groupIds changes
  const queryKeyRef = useRef<any[]>([
    "group-last-messages",
    groupIds,
    currentUserId,
  ]);
  useEffect(() => {
    queryKeyRef.current = ["group-last-messages", groupIds, currentUserId];
  });

  useEffect(() => {
    if (groupIds.length === 0) return;

    const channel = supabase
      .channel("group-last-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
        },
        async (payload: any) => {
          const raw = payload.new;
          const incomingGroupId = raw?.group_id;

          // Ignore messages from groups the user hasn't joined
          if (!incomingGroupId || !groupIds.includes(incomingGroupId)) return;

          // Fetch the sender's name — lightweight query, users table has no RLS
          let senderName = "Unknown";
          if (raw.user_id) {
            const { data: userData } = await supabase
              .from("users")
              .select("full_name, username")
              .eq("id", raw.user_id)
              .single();
            senderName = userData?.full_name || userData?.username || "Unknown";
          }

          const messageText =
            (raw.message as string) || (raw.image_url ? "📷 Photo" : "");
          const isFromOther = raw.user_id !== currentUserId;

          // Patch the exact cache entry directly — instant update, no refetch
          queryClient.setQueryData(
            queryKeyRef.current,
            (old: any[] | undefined) => {
              if (!old) return old;
              return old.map((entry) => {
                if (entry.groupId !== incomingGroupId) return entry;
                return {
                  ...entry,
                  message: messageText,
                  timestamp: raw.created_at,
                  sender: senderName,
                  // Only increment unread count for messages from other users
                  unreadCount: isFromOther
                    ? (entry.unreadCount ?? 0) + 1
                    : (entry.unreadCount ?? 0),
                };
              });
            },
          );
        },
      )
      .subscribe((status, err) => {
        if (__DEV__) {
          console.log("[ChatList] Realtime:", status, err ?? "");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupIds.join(","), currentUserId, queryClient]);

  return useQuery({
    queryKey: ["group-last-messages", groupIds, currentUserId],
    queryFn: async () => {
      if (groupIds.length === 0) return [];

      // One batch query for all groups sorted desc — first row per group = latest
      const { data, error } = await supabase
        .from("group_messages")
        .select(
          `
          id,
          group_id,
          message,
          image_url,
          created_at,
          is_read,
          user_id,
          user:users!group_messages_user_id_fkey (
            full_name,
            username
          )
        `,
        )
        .in("group_id", groupIds)
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;

      // Build last-message and unread maps in one pass
      const groupMap = new Map<string, any>();
      const unreadMap = new Map<string, number>();

      for (const msg of data || []) {
        const gid = msg.group_id as string;

        // First seen per group = most recent (sorted desc)
        if (!groupMap.has(gid)) {
          groupMap.set(gid, msg);
        }

        // Count unread: messages from others not yet marked as read
        if (currentUserId && msg.user_id !== currentUserId && !msg.is_read) {
          unreadMap.set(gid, (unreadMap.get(gid) ?? 0) + 1);
        }
      }

      return groupIds.map((groupId) => {
        const msg = groupMap.get(groupId);
        if (!msg) {
          return {
            groupId,
            message: null,
            timestamp: null,
            sender: null,
            unreadCount: 0,
          };
        }

        const messageText =
          (msg.message as string) || (msg.image_url ? "📷 Photo" : "");

        return {
          groupId,
          message: messageText,
          timestamp: msg.created_at as string | null,
          sender: (msg.user?.full_name ||
            msg.user?.username ||
            "Unknown") as string,
          unreadCount: unreadMap.get(groupId) ?? 0,
        };
      });
    },
    enabled: groupIds.length > 0,
    // staleTime 0 so switching to the Chat tab always loads fresh data
    staleTime: 0,
  });
}
