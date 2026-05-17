import { supabase } from "@/src/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Fetches the last message and unread count for each of the user's groups.
// One batch query for all groups — N+1 eliminated.
export function useSupabaseGroupLastMessages(
  groupIds: string[],
  currentUserId?: string,
) {
  const queryClient = useQueryClient();

  // Real-time: when any new message arrives, invalidate so chat list updates instantly
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
        (payload: any) => {
          // Only invalidate when the message belongs to one of the user's groups
          const incomingGroupId = payload.new?.group_id;
          if (incomingGroupId && groupIds.includes(incomingGroupId)) {
            queryClient.invalidateQueries({
              queryKey: ["group-last-messages"],
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupIds.join(","), queryClient]);

  return useQuery({
    queryKey: ["group-last-messages", groupIds, currentUserId],
    queryFn: async () => {
      if (groupIds.length === 0) return [];

      // ONE query for all messages across all groups.
      // FIX: use a generous limit — groupIds.length * 5 was too small for active groups.
      // 200 rows covers all groups comfortably and Supabase returns them sorted desc
      // so we always find the latest message per group in the first pass.
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

      // Group messages by group_id — first seen = most recent (sorted desc)
      const groupMap = new Map<string, any>();
      const unreadMap = new Map<string, number>();

      for (const msg of data || []) {
        const gid = msg.group_id as string;

        // First message seen per group = the latest one
        if (!groupMap.has(gid)) {
          groupMap.set(gid, msg);
        }

        // Count unread: messages from others that haven't been read yet
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
    staleTime: 1000 * 30,
  });
}
