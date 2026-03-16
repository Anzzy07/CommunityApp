import { supabase } from "@/src/lib/supabase";
import { Notification } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseNotifications(userId: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      console.log("🔍 Fetching notifications for user:", userId);

      if (!userId) {
        return [];
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching notifications:", error);
        throw error;
      }

      console.log("✅ Fetched notifications:", data?.length || 0);

      const notifications: Notification[] = (data || []).map((n) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type as Notification["type"],
        reference_id: n.reference_id,
        message: n.message,
        is_read: n.is_read ?? false,
        created_at: n.created_at ?? new Date().toISOString(),
      }));

      return notifications;
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds - refresh more frequently for notifications
  });
}
