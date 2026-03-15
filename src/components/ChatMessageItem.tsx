import { COLORS } from "@/src/colors";
import { GroupMessage } from "@/src/types";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  item: GroupMessage;
  isMe: boolean;
  isMember: boolean;
  onReply: (msg: GroupMessage) => void;
  showAvatar?: boolean; // Show avatar only for the last message in a group
  showUsername?: boolean; // Show username only for the first message in a group
};

export default function ChatMessageItem({
  item,
  isMe,
  isMember,
  onReply,
  showAvatar = true,
  showUsername = true,
}: Props) {
  return (
    <Pressable
      onLongPress={() => isMember && onReply(item)}
      style={[styles.messageRow, isMe && styles.myMessageRow]}
    >
      {/* USER AVATAR (only for others and when showAvatar is true) */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {showAvatar ? (
            item.user.image ? (
              <Image source={{ uri: item.user.image }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Text style={styles.avatarText}>
                  {item.user.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )
          ) : (
            <View style={styles.avatarPlaceholder} />
          )}
        </View>
      )}

      {/* MESSAGE BUBBLE */}
      <View
        style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}
      >
        {/* REPLIED MESSAGE */}
        {item.reply_to && (
          <View
            style={[
              styles.replyBox,
              isMe ? styles.myReplyBox : styles.otherReplyBox,
            ]}
          >
            <Text style={[styles.replyUser, isMe && styles.myReplyUser]}>
              {item.reply_to.user_name}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.replyText, isMe && styles.myReplyText]}
            >
              {item.reply_to.message}
            </Text>
          </View>
        )}

        {/* USERNAME (only for others and when showUsername is true) */}
        {!isMe && showUsername && (
          <Text style={styles.username}>{item.user.name}</Text>
        )}

        {/* MESSAGE TEXT */}
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.message}
        </Text>

        {/* TIMESTAMP */}
        <Text style={[styles.time, isMe && styles.myTime]}>
          {formatDistanceToNowStrict(new Date(item.created_at ?? Date.now()), {
            addSuffix: true,
          })}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    marginVertical: 2,
    marginHorizontal: 12,
    alignItems: "flex-end",
  },
  myMessageRow: {
    justifyContent: "flex-end",
  },
  avatarContainer: {
    width: 32,
    marginRight: 8,
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  defaultAvatar: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
  },
  bubble: {
    maxWidth: "75%",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  myBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "white",
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  username: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  myMessageText: {
    color: "white",
  },
  time: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  myTime: {
    color: "rgba(255, 255, 255, 0.8)",
  },
  replyBox: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 6,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderRadius: 4,
  },
  myReplyBox: {
    borderLeftColor: "white",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  otherReplyBox: {
    borderLeftColor: COLORS.primary,
  },
  replyUser: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 2,
  },
  myReplyUser: {
    color: "white",
  },
  replyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  myReplyText: {
    color: "rgba(255, 255, 255, 0.9)",
  },
});
