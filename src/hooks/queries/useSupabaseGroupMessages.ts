import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useSupabaseGroupMessages(groupId: string) {
  return useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      // console.log("🔍 Fetching messages for group:", groupId);

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

      if (error) {
        console.error("❌ Error fetching messages:", error);
        throw error;
      }

      // console.log("✅ Fetched messages:", data?.length || 0);

      // Get all unique reply_to_ids to fetch reply data
      const replyToIds = [
        ...new Set(
          data?.filter((m) => m.reply_to_id).map((m) => m.reply_to_id),
        ),
      ].filter(Boolean) as string[];

      // Fetch reply messages if there are any
      let replyMessages: any[] = [];
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

        replyMessages = replyData || [];
      }

      // Create a map of replies for quick lookup
      const replyMap = new Map(
        replyMessages.map((r) => [
          r.id,
          {
            id: r.id,
            message: r.message,
            user_name: r.user?.full_name || r.user?.username || "Unknown",
          },
        ]),
      );

      // Transform the data
      const messages: GroupMessage[] = (data || []).map((msg: any) => {
        const userData = msg.user;

        return {
          id: msg.id,
          group_id: msg.group_id,
          user: {
            id: userData?.id || msg.user_id,
            name: userData?.full_name || userData?.username || "Unknown",
            image: userData?.image_url || null,
          },
          message: msg.message || "",
          image_url: msg.image_url || null,
          created_at: msg.created_at,
          reply_to: msg.reply_to_id
            ? replyMap.get(msg.reply_to_id) || null
            : null,
        };
      });

      return messages;
    },
    enabled: !!groupId,
    staleTime: 0,
    gcTime: 0,
  });
}

// Real-time subscription hook
export function useGroupMessagesSubscription(
  groupId: string,
  onNewMessage: () => void,
) {
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
        (payload) => {
          // console.log("📨 New message received:", payload);
          onNewMessage();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, onNewMessage]);
}
