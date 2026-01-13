import { GroupMessage } from "@/src/types";
import { formatDistanceToNowStrict } from "date-fns";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  item: GroupMessage;
  isMe: boolean;
  isMember: boolean;
  onReply: (msg: GroupMessage) => void;
};

export default function ChatMessageItem({
  item,
  isMe,
  isMember,
  onReply,
}: Props) {
  return (
    <Pressable
      onLongPress={() => isMember && onReply(item)} // long press to reply
      style={[styles.messageRow, isMe ? styles.right : styles.left]}
    >
      {/* USER AVATAR */}
      {!isMe && (
        <Image
          source={{
            uri:
              item.user.image ??
              "https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/1.jpg",
          }}
          style={styles.avatar}
        />
      )}

      {/* MESSAGE BUBBLE */}
      <View
        style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}
      >
        {/* REPLIED MESSAGE */}
        {item.reply_to && (
          <View style={styles.replyBox}>
            <Text style={styles.replyUser}>{item.reply_to.user_name}</Text>
            <Text style={styles.replyText} numberOfLines={1}>
              {item.reply_to.message}
            </Text>
          </View>
        )}

        {/* USERNAME */}
        {!isMe && <Text style={styles.username}>{item.user.name}</Text>}

        {/* MESSAGE TEXT */}
        <Text style={[styles.messageText, isMe && styles.myMessageText]}>
          {item.message}
        </Text>

        {/* TIMESTAMP */}
        <Text style={styles.time}>
          {formatDistanceToNowStrict(new Date(item.created_at))} ago
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    marginVertical: 5,
    alignItems: "flex-end",
  },
  left: {
    justifyContent: "flex-start",
  },
  right: {
    justifyContent: "flex-end",
    alignSelf: "flex-end",
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  bubble: {
    maxWidth: "75%",
    padding: 10,
    borderRadius: 12,
  },
  myBubble: {
    backgroundColor: "#2E5DAA",
    borderTopRightRadius: 0,
  },
  otherBubble: {
    backgroundColor: "white",
    borderTopLeftRadius: 0,
  },
  username: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555",
    marginBottom: 3,
  },
  messageText: {
    color: "#222",
  },
  myMessageText: {
    color: "white",
  },
  time: {
    fontSize: 10,
    color: "#888",
    marginTop: 4,
    alignSelf: "flex-end",
  },
  replyBox: {
    borderLeftWidth: 3,
    borderLeftColor: "#2E5DAA",
    paddingLeft: 6,
    marginBottom: 5,
  },
  replyUser: {
    fontSize: 11,
    fontWeight: "600",
  },
  replyText: {
    fontSize: 11,
    color: "#555",
  },
});
