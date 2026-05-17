import { NotificationType } from "@/src/types";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

// Configure how notifications behave when the app is in the foreground.
// All display options are enabled so the user sees alerts and hears sounds
// even while actively using the app.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request push notification permissions and retrieve the Expo push token.
// The token is needed to send remote notifications to this specific device.
// Errors are caught at each step so a missing Firebase configuration or
// denied permission does not crash the app — local notifications still work.
export async function registerForPushNotificationsAsync() {
  try {
    let token;

    // Android requires a notification channel to be created before any
    // notification can be displayed
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#9CAF88",
      });
    }

    // Check the current permission status before requesting to avoid
    // showing the system prompt unnecessarily
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push notification permissions!");
      return;
    }

    // Retrieve the Expo push token — this may fail if Firebase is not configured.
    // The app continues without a token; local notifications are unaffected.
    try {
      token = (
        await Notifications.getExpoPushTokenAsync({
          projectId: "e18d70d7-7504-45c7-8fef-868c79c0b99b",
        })
      ).data;
      console.log("✅ Push token:", token);
      return token;
    } catch (error) {
      console.log(
        "⚠️ Error getting push token (Firebase not configured):",
        error,
      );
      console.log("📱 Local notifications will still work!");
      return null;
    }
  } catch (error) {
    console.log("⚠️ Notification setup error:", error);
    console.log("📱 Continuing without push notifications");
    return null;
  }
}

// Trigger an immediate local notification.
// Passing trigger: null causes the notification to fire straight away
// without any scheduling delay.
export async function scheduleNotification(
  title: string,
  body: string,
  data?: {
    type: NotificationType;
    referenceId: string;
    notificationId?: string;
    addToInbox?: boolean;
  },
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as Record<string, unknown>,
        sound: true,
      },
      trigger: null,
    });
  } catch (error) {
    console.log("Error scheduling notification:", error);
  }
}

// Schedule a local notification to appear after a given number of seconds.
// Useful for reminders or deferred alerts that should not show immediately.
export async function scheduleDelayedNotification(
  title: string,
  body: string,
  seconds: number,
  data?: {
    type: NotificationType;
    referenceId: string;
    notificationId?: string;
    addToInbox?: boolean;
  },
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data as Record<string, unknown>,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  } catch (error) {
    console.log("Error scheduling delayed notification:", error);
  }
}

// Called when the user taps a notification banner.
// Marks the notification as read in the database then deep-links to
// the relevant screen based on the notification type.
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  markAsRead: (id: string) => void,
) {
  const data = response.notification.request.content.data as {
    notificationId?: string;
    type?: string;
    referenceId?: string;
  };

  // Mark as read before navigating so the badge count is correct immediately
  if (data?.notificationId) {
    markAsRead(data.notificationId);
  }

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
}

// Remove all locally scheduled notifications that have not yet been delivered
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Return the current numeric value of the app icon badge
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

// Update the iOS app icon badge to the given count.
// This is a no-op on Android, which manages badges differently.
export async function setBadgeCount(count: number) {
  if (Platform.OS === "ios") {
    await Notifications.setBadgeCountAsync(count);
  }
}

// Reset the iOS app icon badge to zero, typically called when the user
// opens the inbox screen and has acknowledged any pending notifications
export async function clearBadge() {
  if (Platform.OS === "ios") {
    await Notifications.setBadgeCountAsync(0);
  }
}
