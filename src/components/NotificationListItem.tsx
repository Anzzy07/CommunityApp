import { COLORS } from "@/src/colors";
import { Notification } from "@/src/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { Pressable, Text, View } from "react-native";

type Props = {
  notification: Notification;
  onPress: () => void;
};

export default function NotificationListItem({ notification, onPress }: Props) {
  const iconMap = {
    comment: "comment-outline",
    post: "post-outline",
    poll: "poll",
    challenge: "trophy-outline",
    message: "chat-outline",
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: notification.is_read ? "white" : "#EFF6FF",
        padding: 14,
        borderBottomWidth: 0.5,
        borderColor: "#E5E7EB",
        flexDirection: "row",
        gap: 12,
      }}
    >
      <MaterialCommunityIcons
        name={iconMap[notification.type] as any}
        size={22}
        color={COLORS.primary}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: notification.is_read ? "400" : "600",
          }}
        >
          {notification.message}
        </Text>

        <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
          {formatDistanceToNowStrict(new Date(notification.created_at))} ago
        </Text>
      </View>
    </Pressable>
  );
}
