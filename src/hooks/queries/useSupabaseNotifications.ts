import { supabase } from "@/src/lib/supabase";
import { Notification } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseNotifications(userId: string) {
  return useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const notifications: Notification[] = (data || []).map((n) => ({
        id: n.id,
        user_id: n.user_id,
        type: n.type as any,
        reference_id: n.reference_id,
        message: n.message,
        is_read: n.is_read ?? false,
        created_at: n.created_at!,
      }));

      return notifications;
    },
    enabled: !!userId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Get unread count
export function useSupabaseUnreadNotificationsCount(userId: string) {
  return useQuery({
    queryKey: ["notifications-unread-count", userId],
    queryFn: async () => {
      if (!userId) return 0;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;

      return count || 0;
    },
    enabled: !!userId,
    staleTime: 1000 * 10, // 10 seconds - refresh more often
    refetchInterval: 1000 * 30, // Auto-refetch every 30 seconds
  });
}
