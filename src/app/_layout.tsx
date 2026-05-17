import { supabase } from "@/src/lib/supabase";
import { syncClerkUserToSupabase } from "@/src/utils/clerkSupabaseSync";
import {
  clearBadge,
  registerForPushNotificationsAsync,
  setBadgeCount,
} from "@/src/utils/notificationService";
import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { router, Slot } from "expo-router";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

// Runs on every mount to ensure the Clerk user record exists in Supabase.
function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      syncClerkUserToSupabase(user);
    }
  }, [isLoaded, user]);

  return null;
}

// Keeps the iOS app icon badge count in sync with the number of unread notifications.
// A real-time Supabase subscription ensures the badge updates even when the app is open.
function BadgeSync() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (Platform.OS === "ios" && count !== null) {
        setBadgeCount(count);
      }
    };

    fetchUnreadCount();

    // Subscribe to any change on the notifications table for this user
    // so the badge refreshes without requiring a manual pull-to-refresh
    const channel = supabase
      .channel("notifications-badge")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
}

// Manages push notification registration and handles notification events
// both while the app is in the foreground and when the user taps a notification
function NotificationHandler() {
  const { user } = useUser();

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync();

    // Clear the badge when the app is opened fresh
    clearBadge();

    // saves the notification to Supabase so it appears in the inbox
    notificationListener.current =
      Notifications.addNotificationReceivedListener(async (notification) => {
        console.log("Notification received:", notification);

        const data = notification.request.content.data as {
          addToInbox?: boolean;
          type?: string;
          referenceId?: string;
        };

        if (data?.addToInbox && user?.id) {
          try {
            await supabase.from("notifications").insert({
              user_id: user.id,
              type: data.type || "post",
              reference_id: data.referenceId || "",
              message: notification.request.content.body || "",
              is_read: false,
            });
          } catch (error) {
            console.error("Error saving notification:", error);
          }
        }
      });

    // marks the notification as read and deep-links to its detail screen
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("Notification tapped:", response);

          const data = response.notification.request.content.data as {
            notificationId?: string;
            type?: string;
            referenceId?: string;
          };

          // Mark the tapped notification as read so the badge count decreases
          if (data?.notificationId) {
            await supabase
              .from("notifications")
              .update({ is_read: true })
              .eq("id", data.notificationId);
          }

          // Route to the appropriate screen based on the notification type
          if (data?.type && data?.referenceId) {
            switch (data.type) {
              case "comment":
              case "post":
              case "poll":
                router.push(`/post/${data.referenceId}`);
                break;
              case "challenge":
                router.push(`/community/${data.referenceId}`);
                break;
              case "message":
                router.push("/chat");
                break;
            }
          }
        },
      );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  return null;
}

export default function RootLayout() {
  useReactQueryDevTools(queryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider tokenCache={tokenCache}>
        {/* Helper components are rendered here so they have access to both
            the React Query context and the Clerk user session */}
        <UserSync />
        <BadgeSync />
        <NotificationHandler />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Slot />
        </GestureHandlerRootView>
      </ClerkProvider>
    </QueryClientProvider>
  );
}
