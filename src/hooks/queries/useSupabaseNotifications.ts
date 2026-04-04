import { supabase } from "@/src/lib/supabase";
import { Notification } from "@/src/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

// Fetches all notifications for a user with real-time updates
export function useSupabaseNotifications(userId: string) {
  const queryClient = useQueryClient();

  // Real-time subscription — new notifications appear instantly without polling
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
          // Invalidate both notification queries so badge and list stay in sync
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

// Get unread count for badge display on the notifications tab
export function useSupabaseUnreadNotificationsCount(userId: string) {
  const queryClient = useQueryClient();

  // Same real-time channel keeps badge count in sync instantly
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-count-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
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
    // Remove polling — real-time handles updates now
    // refetchInterval was 30s before, real-time is instant
  });
}
