import { COLORS } from "@/src/colors";
import { Notification, NotificationType } from "@/src/types";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";

type Props = {
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
};

// Get icon and color based on notification type
const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case "comment":
      return {
        name: "comment-outline" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#E3F2FD",
        iconColor: "#1976D2",
      };
    case "post":
      return {
        name: "post-outline" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#F3E5F5",
        iconColor: "#7B1FA2",
      };
    case "poll":
      return {
        name: "chart-bar" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#FFF3E0",
        iconColor: "#F57C00",
      };
    case "challenge":
      return {
        name: "trophy-outline" as const,
        IconComponent: MaterialCommunityIcons,
        backgroundColor: "#FFF9C4",
        iconColor: "#F9A825",
      };
    case "message":
      return {
        name: "chatbubble-ellipses-outline" as const,
        IconComponent: Ionicons,
        backgroundColor: "#E8F5E9",
        iconColor: "#388E3C",
      };
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
  const iconConfig = getNotificationIcon(notification.type);
  const { IconComponent, name, backgroundColor, iconColor } = iconConfig;

  const renderRightActions = (
    _progress: SharedValue<number>,
    _drag: SharedValue<number>,
  ) => {
    return (
      <View style={styles.deleteContainer}>
        <Pressable onPress={onDelete} style={styles.deleteButton}>
          <MaterialCommunityIcons name="trash-can" size={24} color="white" />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
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
              backgroundColor: notification.is_read
                ? "white"
                : COLORS.background,
              borderLeftWidth: notification.is_read ? 0 : 4,
              borderLeftColor: COLORS.primary,
            },
          ]}
        >
          {/* ICON */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: backgroundColor,
              },
            ]}
          >
            <IconComponent name={name} size={22} color={iconColor} />
          </View>

          {/* CONTENT */}
          <View style={styles.contentContainer}>
            <Text
              style={[
                styles.message,
                {
                  fontWeight: notification.is_read ? "400" : "600",
                },
              ]}
              numberOfLines={2}
            >
              {notification.message}
            </Text>

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

          {/* UNREAD INDICATOR */}
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
    marginVertical: 6,
  },
  container: {
    padding: 16,
    borderRadius: 16,
    flexDirection: "row",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  message: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 6,
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
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  deleteContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 90,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    height: "100%",
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    gap: 4,
  },
  deleteText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
