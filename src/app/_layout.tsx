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

// Component that syncs Clerk user to Supabase
function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (isLoaded && user) {
      syncClerkUserToSupabase(user);
    }
  }, [isLoaded, user]);

  return null;
}

// Badge counter synced with Supabase
function BadgeSync() {
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    // Fetch unread count from Supabase
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

    // Set up realtime subscription for badge updates
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

// Notification handler component
function NotificationHandler() {
  const { user } = useUser();

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync();

    // Clear badge when app opens
    clearBadge();

    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener(async (notification) => {
        console.log("Notification received:", notification);

        const data = notification.request.content.data as {
          addToInbox?: boolean;
          type?: string;
          referenceId?: string;
        };

        // If notification should be added to Supabase
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

    // Listener for when user taps notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          console.log("Notification tapped:", response);

          const data = response.notification.request.content.data as {
            notificationId?: string;
            type?: string;
            referenceId?: string;
          };

          // Mark as read in Supabase
          if (data?.notificationId) {
            await supabase
              .from("notifications")
              .update({ is_read: true })
              .eq("id", data.notificationId);
          }

          // Navigate based on type
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
