import { COLORS } from "@/src/colors";
import { Comment } from "@/src/types";
import { Entypo, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { memo, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

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
  // State for UI interactions
  const [showReplies, setShowReplies] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [voteStatus, setVoteStatus] = useState<"up" | "down" | null>(null);
  const [hasAwarded, setHasAwarded] = useState(false);

  // Handle upvote
  // Toggles upvote state and updates count

  const handleUpvote = () => {
    if (voteStatus === "up") {
      setUpvotes(upvotes - 1);
      setVoteStatus(null);
    } else {
      setUpvotes(voteStatus === "down" ? upvotes + 2 : upvotes + 1);
      setVoteStatus("up");
    }
  };

  // Handle downvote
  // Toggles downvote state and updates count
  const handleDownvote = () => {
    if (voteStatus === "down") {
      setUpvotes(upvotes + 1);
      setVoteStatus(null);
    } else {
      setUpvotes(voteStatus === "up" ? upvotes - 2 : upvotes - 1);
      setVoteStatus("down");
    }
  };

  // Handle award/trophy

  const handleAward = () => {
    if (hasAwarded) {
      setHasAwarded(false);
    } else {
      setHasAwarded(true);
      Alert.alert("Award Given!", "You gave an award to this comment! 🏆");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: depth === 0 ? "#FFFFFF" : "#FAFAFA",
          marginLeft: Math.min(depth, MAX_DEPTH) * INDENT,
          borderLeftWidth: depth > 0 ? 2 : 0,
        },
      ]}
    >
      {/* USER INFO */}
      <View style={styles.userInfo}>
        <Image
          source={{ uri: comment.user.image || DEFAULT_AVATAR }}
          style={styles.avatar}
        />

        <View style={styles.userDetails}>
          <Text style={styles.username}>{comment.user.name}</Text>
          <Text style={styles.timestamp}>
            · {formatDistanceToNowStrict(new Date(comment.created_at))}
          </Text>
        </View>
      </View>

      {/* COMMENT TEXT */}
      <Text style={styles.commentText}>{comment.comment}</Text>

      {/* ACTION BAR */}
      <View style={styles.actionBar}>
        {/* LEFT ACTIONS */}
        <View style={styles.leftActions}>
          {/* Reply */}
          <Pressable
            hitSlop={10}
            onPress={() => handleReplyPress(comment.id, comment.user.name)}
            style={styles.actionIcon}
          >
            <Octicons name="reply" size={16} color={COLORS.textSecondary} />
          </Pressable>

          {/* Award */}
          <Pressable
            hitSlop={10}
            onPress={handleAward}
            style={styles.actionIcon}
          >
            <MaterialCommunityIcons
              name={hasAwarded ? "trophy" : "trophy-outline"}
              size={16}
              color={hasAwarded ? "#F59E0B" : COLORS.textSecondary}
            />
          </Pressable>

          {/* More options */}
          <Pressable hitSlop={10} style={styles.actionIcon}>
            <Entypo
              name="dots-three-horizontal"
              size={14}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>

        {/* VOTING */}
        <View style={styles.votingContainer}>
          {/* Upvote */}
          <Pressable hitSlop={10} onPress={handleUpvote}>
            <MaterialCommunityIcons
              name={
                voteStatus === "up" ? "arrow-up-bold" : "arrow-up-bold-outline"
              }
              size={18}
              color={
                voteStatus === "up" ? COLORS.primary : COLORS.textSecondary
              }
            />
          </Pressable>

          {/* Vote count */}
          <Text style={styles.voteCount}>{upvotes}</Text>

          {/* Downvote */}
          <Pressable hitSlop={10} onPress={handleDownvote}>
            <MaterialCommunityIcons
              name={
                voteStatus === "down"
                  ? "arrow-down-bold"
                  : "arrow-down-bold-outline"
              }
              size={18}
              color={voteStatus === "down" ? "#DC2626" : COLORS.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {/* SHOW / HIDE REPLIES */}
      {comment.replies.length > 0 && depth < MAX_DEPTH && (
        <Pressable onPress={() => setShowReplies((v) => !v)}>
          <Text style={styles.repliesToggle}>
            {showReplies
              ? "Hide replies"
              : `View ${comment.replies.length} ${
                  comment.replies.length === 1 ? "reply" : "replies"
                }`}
          </Text>
        </Pressable>
      )}

      {/* NESTED REPLIES */}
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

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderLeftColor: "#E5E7EB",
    gap: 6,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  userDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  username: {
    fontWeight: "600",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  timestamp: {
    color: "#A3A3A3",
    fontSize: 12,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#262626",
  },
  actionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  leftActions: {
    flexDirection: "row",
    gap: 16,
  },
  actionIcon: {
    padding: 2,
  },
  votingContainer: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  voteCount: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  repliesToggle: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.primary,
    marginTop: 2,
  },
});

export default memo(CommentListItem);
