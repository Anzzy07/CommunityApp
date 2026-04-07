import { supabase } from "@/src/lib/supabase";
import { Notification } from "@/src/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Single shared real-time hook — call this ONCE at the app root level
// (e.g. in your tab layout) so the subscription stays alive across screens.
// It updates BOTH the notification list and the badge count in one place.
export function useNotificationsRealtime(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate both queries in one place so badge and list always sync
          queryClient.invalidateQueries({
            queryKey: ["notifications", userId],
          });
          queryClient.invalidateQueries({
            queryKey: ["notifications-unread-count", userId],
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

// Fetches all notifications for a user — no real-time here, handled above
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
    staleTime: 1000 * 30,
  });
}

// Fetches just the unread count — used for the tab badge icon
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
    staleTime: 1000 * 10,
  });
}
