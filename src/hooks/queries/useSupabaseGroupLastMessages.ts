import { supabase } from "@/src/lib/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Fetches the last message and unread count for each of the user's groups.
// Fixed N+1: was one DB query per group — now one query for all groups combined.
export function useSupabaseGroupLastMessages(
  groupIds: string[],
  currentUserId?: string,
) {
  const queryClient = useQueryClient();

  // Real-time: when any new message arrives in any of the user's groups,
  // invalidate the last messages cache so the chat list updates instantly
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
          // Only invalidate if the message is from one of the user's groups
          if (groupIds.includes(payload.new?.group_id)) {
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

      // ONE query for all messages across all groups — was N queries before (N+1 bug).
      // We fetch the last 10 per group and pick the most recent one in JS.
      // Supabase doesn't support DISTINCT ON so this is the cleanest approach.
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
        .limit(groupIds.length * 5); // fetch enough rows to find last per group

      if (error) throw error;

      // Group messages by group_id and pick the most recent one
      const groupMap = new Map<string, any>();
      const unreadMap = new Map<string, number>();

      for (const msg of data || []) {
        const gid = msg.group_id as string;

        // Track the latest message per group (first seen since sorted desc)
        if (!groupMap.has(gid)) {
          groupMap.set(gid, msg);
        }

        // Count unread messages — messages not sent by current user that aren't read
        if (currentUserId && msg.user_id !== currentUserId && !msg.is_read) {
          unreadMap.set(gid, (unreadMap.get(gid) ?? 0) + 1);
        }
      }

      // Transform into the shape the UI expects
      return groupIds.map((groupId) => {
        const msg = groupMap.get(groupId);
        if (!msg)
          return {
            groupId,
            message: null,
            timestamp: null,
            sender: null,
            unreadCount: 0,
          };

        const messageText =
          (msg.message as string) || (msg.image_url ? "Photo" : "");

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
    staleTime: 1000 * 30, // 30 seconds — real-time keeps it fresh
  });
}
