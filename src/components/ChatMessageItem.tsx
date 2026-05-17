import { COLORS } from "@/src/colors";
import SupabaseImage from "@/src/components/SupabaseImage";
import { GroupMessage } from "@/src/types";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  item: GroupMessage;
  isMe: boolean;
  isMember: boolean;
  onReply: (msg: GroupMessage) => void;
  showAvatar?: boolean;
  showUsername?: boolean;
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
    // Long-press opens the reply
    <Pressable
      onLongPress={() => isMember && onReply(item)}
      style={[styles.messageRow, isMe && styles.myMessageRow]}
    >
      {/* Avatar for messages from other users */}
      {!isMe && (
        <View style={styles.avatarContainer}>
          {showAvatar ? (
            item.user.image ? (
              <Image source={{ uri: item.user.image }} style={styles.avatar} />
            ) : (
              // Fallback avatar uses the first letter of the sender's name
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

      {/* Message bubble */}
      <View
        style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}
      >
        {/* Quoted message preview shown when this message is a reply to another */}
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

        {/* Sender name is shown only for other users' messages and only on the
            first bubble in a consecutive run from the same sender */}
        {!isMe && showUsername && (
          <Text style={styles.username}>{item.user.name}</Text>
        )}

        {/* Message text — conditionally rendered because the message may be image-only */}
        {item.message && (
          <Text style={[styles.messageText, isMe && styles.myMessageText]}>
            {item.message}
          </Text>
        )}

        {/* Attached image fetched from Supabase Storage via the shared SupabaseImage component */}
        {item.image_url && (
          <SupabaseImage path={item.image_url} style={styles.messageImage} />
        )}

        {/* Relative timestamp shown at the bottom-right of every bubble */}
        <Text style={[styles.time, isMe && styles.myTime]}>
          {formatDistanceToNowStrict(new Date(item.created_at ?? Date.now()), {
            addSuffix: true,
          })}
        </Text>
      </View>

      {/* Avatar for the current user's messages — positioned on the right,
          using the same grouping logic as the left-side avatar */}
      {isMe && (
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
    marginHorizontal: 8,
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
  messageImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    marginTop: 8,
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
