import { COLORS } from "@/src/colors";
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
  ) => {
    return (
      <Pressable
        onPress={onDelete}
        style={{
          backgroundColor: COLORS.error,
          justifyContent: "center",
          alignItems: "center",
          width: 80,
          borderTopRightRadius: 16,
          borderBottomRightRadius: 16,
          marginVertical: 6,
        }}
      >
        <MaterialCommunityIcons name="trash-can" size={22} color="white" />
      </Pressable>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        onPress={onPress}
        style={{
          backgroundColor: notification.is_read ? "white" : COLORS.background,
          marginHorizontal: 12,
          marginVertical: 6,
          padding: 18,
          borderRadius: 16,
          flexDirection: "row",
          gap: 14,
          borderLeftWidth: notification.is_read ? 0 : 4,
          borderLeftColor: COLORS.primary,
        }}
      >
        {/* ICON */}
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: COLORS.surface,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <MaterialCommunityIcons
            name="bell-outline"
            size={20}
            color={COLORS.textPrimary}
          />
        </View>

        {/* CONTENT */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: notification.is_read ? "400" : "600",
              color: COLORS.textPrimary,
              lineHeight: 20,
            }}
          >
            {notification.message}
          </Text>

          <Text
            style={{
              marginTop: 6,
              fontSize: 12,
              color: COLORS.textSecondary,
            }}
          >
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
