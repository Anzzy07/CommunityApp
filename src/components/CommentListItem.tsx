import { Entypo, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { memo, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Comment } from "../types";

type CommentListItemProps = {
  comment: Comment;
  depth: number;
  handleReplyPress: (commentId: string, username: string) => void;
};

const MAX_DEPTH = 4;
const INDENT = 14;
const DEFAULT_AVATAR =
  "https://notjustdev-dummy.s3.us-east-2.amazonaws.com/avatars/3.jpg";

const CommentListItem = ({
  comment,
  depth,
  handleReplyPress,
}: CommentListItemProps) => {
  const [showReplies, setShowReplies] = useState(false);

  return (
    <View
      style={{
        backgroundColor: depth === 0 ? "#FFFFFF" : "#FAFAFA",
        marginTop: 8,
        padding: 10,
        marginLeft: Math.min(depth, MAX_DEPTH) * INDENT,
        borderRadius: 8,
        borderLeftWidth: depth > 0 ? 2 : 0,
        borderLeftColor: "#E5E7EB",
        gap: 6,
      }}
    >
      {/* USER INFO */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Image
          source={{ uri: comment.user.image || DEFAULT_AVATAR }}
          style={{ width: 30, height: 30, borderRadius: 15 }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontWeight: "600", fontSize: 13 }}>
            {comment.user.name}
          </Text>
          <Text style={{ color: "#A3A3A3", fontSize: 12 }}>
            · {formatDistanceToNowStrict(new Date(comment.created_at))}
          </Text>
        </View>
      </View>

      {/* COMMENT  */}
      <Text
        style={{
          fontSize: 14,
          lineHeight: 20,
          color: "#262626",
        }}
      >
        {comment.comment}
      </Text>

      {/* ACTION BAR */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4,
        }}
      >
        {/* LEFT ACTIONS */}
        <View style={{ flexDirection: "row", gap: 16 }}>
          <Pressable
            hitSlop={10}
            onPress={() => handleReplyPress(comment.id, comment.user.name)}
          >
            <Octicons name="reply" size={16} color="#737373" />
          </Pressable>

          <MaterialCommunityIcons
            name="trophy-outline"
            size={16}
            color="#737373"
          />

          <Entypo name="dots-three-horizontal" size={14} color="#737373" />
        </View>

        {/* VOTING */}
        <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
          <Pressable hitSlop={10}>
            <MaterialCommunityIcons
              name="arrow-up-bold-outline"
              size={18}
              color="#737373"
            />
          </Pressable>

          <Text style={{ fontSize: 13, fontWeight: "500" }}>
            {comment.upvotes}
          </Text>

          <Pressable hitSlop={10}>
            <MaterialCommunityIcons
              name="arrow-down-bold-outline"
              size={18}
              color="#737373"
            />
          </Pressable>
        </View>
      </View>

      {/* SHOW / HIDE REPLIES */}
      {comment.replies.length > 0 && depth < MAX_DEPTH && (
        <Pressable onPress={() => setShowReplies((v) => !v)}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: "500",
              color: "#2563EB",
              marginTop: 2,
            }}
          >
            {showReplies
              ? "Hide replies"
              : `View ${comment.replies.length} replies`}
          </Text>
        </Pressable>
      )}

      {/* NESTED REPLIES  */}
      {showReplies &&
        comment.replies.map((reply) => (
          <CommentListItem
            key={reply.id}
            comment={reply}
            depth={depth + 1}
            handleReplyPress={handleReplyPress}
          />
        ))}
    </View>
  );
};

export default memo(CommentListItem);
