import { COLORS } from "@/src/colors";
import { useDeleteNotification } from "@/src/hooks/mutations/useNotificationMutations";
import { Notification, NotificationType } from "@/src/types";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

type Props = {
  notification: Notification;
  onPress: () => void;
  onDelete?: () => void;
};

// Maps a notification type to its icon name, component, background colour and icon colour.
// Centralising this logic here keeps the render function clean and makes it easy
// to add new notification types in one place.
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "comment":
      return {
        name: "comment-outline" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#EBF5FF",
        iconColor: "#0369A1",
      };
    case "post":
      return {
        name: "post-outline" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#F3E8FF",
        iconColor: "#9333EA",
      };
    case "poll":
      return {
        name: "chart-bar" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#FFF7ED",
        iconColor: "#EA580C",
      };
    case "challenge":
      return {
        name: "trophy-outline" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#FEF9C3",
        iconColor: "#CA8A04",
      };
    case "message":
      return {
        name: "chatbubble-ellipses-outline" as const,
        IconComponent: Ionicons,
        backgroundColor: "#ECFDF5",
        iconColor: "#059669",
      };
    // Unknown types fall back to a generic bell icon
    default:
      return {
        name: "bell-outline" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: COLORS.surface,
        iconColor: COLORS.textPrimary,
      };
  }
};

export default function NotificationListItem({
  notification,
  onPress,
  onDelete,
}: Props) {
  const deleteMutation = useDeleteNotification();
  const iconConfig = getNotificationIcon(notification.type);
  const { IconComponent, name, backgroundColor, iconColor } = iconConfig;

  // Delete the notification from the database then call the optional onDelete callback
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(notification.id);
      if (onDelete) onDelete();
    } catch (error) {
      Alert.alert("Error", "Failed to delete notification");
    }
  };

  // Renders the red delete action that appears when the user swipes the row to the left.
  // The animated translateX slides the action panel in from the right as the swipe progresses.
  const renderRightActions = (
    progress: SharedValue<number>,
    _drag: SharedValue<number>,
  ) => {
    const animatedStyle = useAnimatedStyle(() => {
      const translateX = withTiming(progress.value > 0 ? 0 : 100);
      return { transform: [{ translateX }] };
    });

    return (
      <Animated.View style={[styles.deleteContainer, animatedStyle]}>
        <Pressable onPress={handleDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={24}
            color="white"
          />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.swipeableWrapper}>
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          onPress={onPress}
          style={[
            styles.container,
            {
              // Unread notifications have a tinted background and a coloured left border
              // so they are immediately distinguishable from read ones
              backgroundColor: notification.is_read ? "white" : "#F0FDF4",
              borderLeftWidth: notification.is_read ? 0 : 3,
              borderLeftColor: COLORS.primary,
            },
          ]}
        >
          {/* Coloured icon circle whose appearance is determined by the notification type */}
          <View style={[styles.iconContainer, { backgroundColor }]}>
            <IconComponent name={name} size={24} color={iconColor} />
          </View>

          <View style={styles.contentContainer}>
            {/* Unread notifications are rendered in bold to draw the user's attention */}
            <Text
              style={[
                styles.message,
                { fontWeight: notification.is_read ? "400" : "600" },
              ]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>

            {/* Relative timestamp shown below the message text */}
            <View style={styles.metaContainer}>
              <Feather
                name="clock"
                size={12}
                color={COLORS.textSecondary}
                style={styles.clockIcon}
              />
              <Text style={styles.timeText}>
                {formatDistanceToNowStrict(new Date(notification.created_at), {
                  addSuffix: true,
                })}
              </Text>
            </View>
          </View>

          {/* Small green dot on the right edge to indicate an unread notification */}
          {!notification.is_read && (
            <View style={styles.unreadIndicator}>
              <View style={styles.unreadDot} />
            </View>
          )}
        </Pressable>
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  swipeableWrapper: {
    marginHorizontal: 12,
    marginVertical: 4,
  },
  container: {
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    gap: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  message: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  clockIcon: {
    marginRight: 4,
  },
  timeText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  unreadIndicator: {
    justifyContent: "center",
    alignItems: "center",
    paddingLeft: 4,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  deleteContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 12,
  },
  deleteButton: {
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    width: 90,
    height: "100%",
    borderRadius: 16,
    gap: 4,
  },
  deleteText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
