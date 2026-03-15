import { COLORS } from "@/src/colors";
import { Group } from "@/src/types";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  group: Group;
  lastMessage?: {
    text: string;
    timestamp: string;
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
  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Group Image */}
      <Image source={{ uri: group.image }} style={styles.groupImage} />

      {/* Group Info */}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.groupName} numberOfLines={1}>
            {group.name}
          </Text>
          {lastMessage && (
            <Text style={styles.timestamp}>
              {formatDistanceToNowStrict(
                new Date(lastMessage.timestamp ?? Date.now()),
                {
                  addSuffix: false,
                },
              )}
            </Text>
          )}
        </View>

        {lastMessage ? (
          <Text style={styles.lastMessage} numberOfLines={1}>
            <Text style={styles.sender}>{lastMessage.sender}: </Text>
            {lastMessage.text}
          </Text>
        ) : (
          <Text style={styles.noMessages}>No messages yet</Text>
        )}
      </View>

      {/* Unread Badge */}
      {unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  groupImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sender: {
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  noMessages: {
    fontSize: 14,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  unreadText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});
