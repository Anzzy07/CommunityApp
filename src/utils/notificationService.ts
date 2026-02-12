import { NotificationType } from "@/src/types";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { Platform } from "react-native";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9CAF88",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    alert("Failed to get push notification permissions!");
    return;
  }

  try {
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Push token:", token);
  } catch (error) {
    console.error("Error getting push token:", error);
  }

  return token;
}

// Schedule a local notification
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
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, unknown>,
      sound: true,
    },
    trigger: null, // Show immediately
  });
}

// Schedule notification with delay
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
}

// Handle notification tap
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  markAsRead: (id: string) => void,
) {
  const data = response.notification.request.content.data as {
    notificationId?: string;
    type?: string;
    referenceId?: string;
  };

  if (data?.notificationId) {
    markAsRead(data.notificationId);
  }

  if (data?.type && data?.referenceId) {
    // Navigate based on notification type
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

// Cancel all scheduled notifications
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get badge count
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

// Set badge count
export async function setBadgeCount(count: number) {
  if (Platform.OS === "ios") {
    await Notifications.setBadgeCountAsync(count);
  }
}

// Clear badge
export async function clearBadge() {
  if (Platform.OS === "ios") {
    await Notifications.setBadgeCountAsync(0);
  }
}
