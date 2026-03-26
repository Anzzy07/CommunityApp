import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseGroupLastMessages(groupIds: string[]) {
  return useQuery({
    queryKey: ["group-last-messages", groupIds],
    queryFn: async () => {
      if (groupIds.length === 0) return [];

      // console.log("🔍 Fetching last messages for groups:", groupIds);

      // Get last message for each group
      const messagesPromises = groupIds.map(async (groupId) => {
        const { data, error } = await supabase
          .from("group_messages")
          .select(
            `
            id,
            message,
            image_url,
            created_at,
            user:users!group_messages_user_id_fkey (
              full_name,
              username
            )
          `,
          )
          .eq("group_id", groupId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") {
          // Ignore "no rows" error
          console.error("❌ Error fetching last message:", error);
          return null;
        }

        if (!data) return null;

        // If message has an image but no text, show "Photo"
        const messageText = data.message || (data.image_url ? "Photo" : "");

        return {
          groupId,
          message: messageText,
          timestamp: data.created_at,
          sender: data.user?.full_name || data.user?.username || "Unknown",
        };
      });

      const messages = await Promise.all(messagesPromises);
      const validMessages = messages.filter(Boolean);

      // console.log("✅ Fetched last messages:", validMessages.length);

      return validMessages;
    },
    enabled: groupIds.length > 0,
    staleTime: 1000 * 30, // 30 seconds
  });
}
