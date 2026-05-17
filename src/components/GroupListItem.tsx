import { COLORS } from "@/src/colors";
import { Group } from "@/src/types";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  group: Group;
  lastMessage?: {
    text: string;
    timestamp: string | null;
    sender: string;
  };
  unreadCount?: number;
  onPress: () => void;
};

export default function GroupListItem({
  group,
  lastMessage,
  unreadCount = 0,
  onPress,
}: Props) {
  const hasUnread = unreadCount > 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {/* Group avatar */}
      <Image
        source={{ uri: group.image || "https://via.placeholder.com/50" }}
        style={styles.avatar}
      />

      {/* Middle: name + last message preview */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          {/* Group name  */}
          <Text
            style={[styles.groupName, hasUnread && styles.groupNameUnread]}
            numberOfLines={1}
          >
            {group.name}
          </Text>

          {/* Timestamp — green when unread */}
          {lastMessage?.timestamp && (
            <Text
              style={[styles.timestamp, hasUnread && styles.timestampUnread]}
            >
              {formatDistanceToNowStrict(new Date(lastMessage.timestamp), {
                addSuffix: false,
              })}
            </Text>
          )}
        </View>

        <View style={styles.bottomRow}>
          {/* Last message preview */}
          {lastMessage ? (
            <Text
              style={[
                styles.lastMessage,
                hasUnread && styles.lastMessageUnread,
              ]}
              numberOfLines={1}
            >
              <Text style={[styles.sender, hasUnread && styles.senderUnread]}>
                {lastMessage.sender}:{" "}
              </Text>
              {lastMessage.text}
            </Text>
          ) : (
            <Text style={styles.noMessages}>No messages yet</Text>
          )}

          {/* Unread badge */}
          {hasUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F0F0",
  },
  pressed: {
    backgroundColor: "#F5F5F5",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
    flex: 1,
  },
  // Bold name when there are unread messages — WhatsApp convention
  groupNameUnread: {
    fontWeight: "700",
    color: "#111111",
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 6,
    flexShrink: 0,
  },
  // Timestamp turns green when there are unread messages
  timestampUnread: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  // Preview text turns darker and slightly bold when unread
  lastMessageUnread: {
    color: "#444444",
    fontWeight: "500",
  },
  sender: {
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  senderUnread: {
    color: "#444444",
    fontWeight: "600",
  },
  noMessages: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
    flex: 1,
  },
  // WhatsApp-style green badge for unread count
  badge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    flexShrink: 0,
  },
  badgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
});
