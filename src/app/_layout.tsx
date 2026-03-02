import { notificationsAtom } from "@/src/atoms/NotificationAtom";
import { NotificationType } from "@/src/types";
import { syncClerkUserToSupabase } from "@/src/utils/clerkSupabaseSync";
import {
  clearBadge,
  handleNotificationResponse,
  registerForPushNotificationsAsync,
  setBadgeCount,
} from "@/src/utils/notificationService";
import { ClerkProvider, useUser } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { useReactQueryDevTools } from "@dev-plugins/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { Slot } from "expo-router";
import { useAtom } from "jotai";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const queryClient = new QueryClient();

// Component that syncs Clerk user to Supabase
function UserSync() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    // When user is loaded and signed in then sync to Supabase
    if (isLoaded && user) {
      syncClerkUserToSupabase(user);
    }
  }, [isLoaded, user]);

  return null; // This component doesn't render anything
}

export default function RootLayout() {
  useReactQueryDevTools(queryClient);
  const [notifications, setNotifications] = useAtom(notificationsAtom);

  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null,
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Setup notifications
  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync();

    // Clear badge when app opens
    clearBadge();

    // Listener for notifications received while app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log("Notification received:", notification);

        // Add to inbox if needed
        const data = notification.request.content.data as {
          addToInbox?: boolean;
          type?: string;
          referenceId?: string;
        };

        if (data?.addToInbox) {
          setNotifications((prev) => [
            {
              id: Math.random().toString(),
              user_id: "current-user",
              type: (data.type as NotificationType) || "post",
              reference_id: (data.referenceId as string) || "",
              message: notification.request.content.body || "",
              is_read: false,
              created_at: new Date().toISOString(),
            },
            ...prev,
          ]);
        }
      });

    // Listener for when user taps notification
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification tapped:", response);

        handleNotificationResponse(response, (id) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
          );
        });
      });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [setNotifications]);

  // Update badge count when notifications change
  useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (Platform.OS === "ios") {
      setBadgeCount(unreadCount);
    }
  }, [notifications]);

  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider tokenCache={tokenCache}>
        <UserSync />
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Slot />
        </GestureHandlerRootView>
      </ClerkProvider>
    </QueryClientProvider>
  );
}
