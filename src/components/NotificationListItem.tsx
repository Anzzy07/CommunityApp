import { Notification } from "@/src/types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React from "react";
import { Pressable, Text, View } from "react-native";
import Swipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SharedValue } from "react-native-reanimated";

type Props = {
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
};

export default function NotificationListItem({
  notification,
  onPress,
  onDelete,
}: Props) {
  const renderRightActions = (
    _progress: SharedValue<number>,
    _drag: SharedValue<number>,
  ) => (
    <Pressable
      onPress={onDelete}
      style={{
        backgroundColor: "#EF4444",
        justifyContent: "center",
        alignItems: "center",
        width: 80,
        marginVertical: 6,
        borderRadius: 14,
      }}
    >
      <MaterialCommunityIcons name="trash-can" size={22} color="white" />
    </Pressable>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        onPress={onPress}
        style={{
          flexDirection: "row",
          padding: 20,
          marginHorizontal: 12,
          marginVertical: 8,
          borderRadius: 16,
          backgroundColor: notification.is_read ? "white" : "#E8EDFF",
        }}
      >
        {/* ICON  */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: "#E5E7EB",
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons
            name={
              notification.type === "comment"
                ? "comment-outline"
                : notification.type === "challenge"
                  ? "trophy-outline"
                  : notification.type === "message"
                    ? "chat-outline"
                    : "bell-outline"
            }
            size={18}
            color="#374151"
          />
        </View>

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={2}
            style={{
              fontSize: 14,
              fontWeight: notification.is_read ? "400" : "600",
              color: "#111827",
            }}
          >
            {notification.message}
          </Text>

          <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>
            {new Date(notification.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}
