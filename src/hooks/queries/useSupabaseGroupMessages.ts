import { supabase } from "@/src/lib/supabase";
import { GroupMessage } from "@/src/types";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export function useSupabaseGroupMessages(groupId: string) {
  return useQuery({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      console.log("🔍 Fetching messages for group:", groupId);

      const { data, error } = await supabase
        .from("group_messages")
        .select(
          `
          *,
          user:users!user_id (
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

      console.log("✅ Fetched messages count:", data?.length || 0);

      // Transform the data
      const messages: GroupMessage[] = (data || []).map((msg: any) => {
        const userData = Array.isArray(msg.user) ? msg.user[0] : msg.user;

        return {
          id: msg.id,
          group_id: msg.group_id,
          user: {
            id: userData?.id || msg.user_id,
            name: userData?.full_name || userData?.username || "Unknown",
            image: userData?.image_url || null,
          },
          message: msg.message || "",
          created_at: msg.created_at,
          reply_to: msg.reply_to_id
            ? {
                id: msg.reply_to_id,
                message: msg.reply_to?.message || "",
                user_name: msg.reply_to?.user_name || "",
              }
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

    console.log("📡 Setting up real-time subscription for group:", groupId);

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
          console.log("📨 New message received:", payload);
          onNewMessage();
        },
      )
      .subscribe();

    return () => {
      console.log("📡 Unsubscribing from group messages");
      supabase.removeChannel(channel);
    };
  }, [groupId, onNewMessage]);
}
