import { supabase } from "@/src/lib/supabase";
import { Notification } from "@/src/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Mark a single notification as read optimistic so dot disappears instantly
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;
    },

    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      // Snapshot for rollback
      const previousNotifications = queryClient.getQueryData(["notifications"]);

      // Instantly mark as read in cache unread dot disappears immediately
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          );
        },
      );

      // Also decrement the unread count badge instantly
      queryClient.setQueriesData(
        { queryKey: ["notifications-unread-count"] },
        (old: number | undefined) => Math.max(0, (old ?? 0) - 1),
      );

      return { previousNotifications };
    },

    onError: (_err, _vars, context) => {
      // Roll back on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications,
        );
      }
    },

    onSettled: () => {
      // Sync with server in background
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

// Mark all notifications as read optimistic bulk update
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (error) throw error;
    },

    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      // Mark every notification as read instantly in cache
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          return old.map((n) => ({ ...n, is_read: true }));
        },
      );

      // Badge count goes to 0 immediately
      queryClient.setQueriesData(
        { queryKey: ["notifications-unread-count"] },
        () => 0,
      );

      return { previousNotifications };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}

// Delete a notification optimistic removal so it disappears instantly
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    },

    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const previousNotifications = queryClient.getQueryData(["notifications"]);

      // Remove from list instantly swipe delete feels immediate
      queryClient.setQueriesData(
        { queryKey: ["notifications"] },
        (old: Notification[] | undefined) => {
          if (!old) return old;
          const removed = old.find((n) => n.id === notificationId);
          // If it was unread, also decrement badge count
          if (removed && !removed.is_read) {
            queryClient.setQueriesData(
              { queryKey: ["notifications-unread-count"] },
              (count: number | undefined) => Math.max(0, (count ?? 0) - 1),
            );
          }
          return old.filter((n) => n.id !== notificationId);
        },
      );

      return { previousNotifications };
    },

    onError: (_err, _vars, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(
          ["notifications"],
          context.previousNotifications,
        );
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({
        queryKey: ["notifications-unread-count"],
      });
    },
  });
}
