import { COLORS } from "@/src/colors";
import {
  useCommentAward,
  useCommentVote,
  useDeleteComment,
  useEditComment,
} from "@/src/hooks/mutations/useCommentMutations";
import { Comment } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { Entypo, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { memo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  useUserCommentAward,
  useUserCommentVote,
} from "../hooks/mutations/useUserVotes";

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
  const { user } = useUser();

  // Source of truth from React Query cache
  const { data: voteStatus } = useUserCommentVote(comment.id, user?.id);
  const { data: userHasAwarded } = useUserCommentAward(comment.id, user?.id);

  const voteMutation = useCommentVote();
  const awardMutation = useCommentAward();
  const editMutation = useEditComment();
  const deleteMutation = useDeleteComment();

  // Only UI state lives locally
  const [showReplies, setShowReplies] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.comment);
  const [showMenu, setShowMenu] = useState(false);

  const currentVote = voteStatus ?? null;
  const hasAwarded = userHasAwarded ?? false;
  // Upvotes come from the comment prop which is driven by the cache
  const upvotes = comment.upvotes ?? 0;

  const isOwner = user?.id === comment.user_id;

  const handleUpvote = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to vote");
      return;
    }
    try {
      await voteMutation.mutateAsync({
        commentId: comment.id,
        userId: user.id,
        voteType: "up",
        postId: comment.post_id,
      });
    } catch {
      Alert.alert("Error", "Failed to vote. Please try again.");
    }
  };

  const handleDownvote = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to vote");
      return;
    }
    try {
      await voteMutation.mutateAsync({
        commentId: comment.id,
        userId: user.id,
        voteType: "down",
        postId: comment.post_id,
      });
    } catch {
      Alert.alert("Error", "Failed to vote. Please try again.");
    }
  };

  const handleAward = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to give awards");
      return;
    }
    try {
      await awardMutation.mutateAsync({
        commentId: comment.id,
        userId: user.id,
        remove: hasAwarded,
        postId: comment.post_id,
      });
      if (!hasAwarded)
        Alert.alert("Award Given!", "You gave an award to this comment! 🏆");
    } catch {
      Alert.alert("Error", "Failed to give award. Please try again.");
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await editMutation.mutateAsync({
        commentId: comment.id,
        comment: editText.trim(),
        postId: comment.post_id,
      });
      setIsEditing(false);
    } catch (error: any) {
      // Log full error so you can see exactly what Supabase says
      console.error("Edit error:", JSON.stringify(error));
      Alert.alert("Error", error?.message || "Failed to edit comment");
    }
  };

  const handleCancelEdit = () => {
    setEditText(comment.comment);
    setIsEditing(false);
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMutation.mutateAsync({
                commentId: comment.id,
                postId: comment.post_id,
              });
              // No alert needed, comment disappears immediately from the list
            } catch (error: any) {
              console.error("Delete error:", JSON.stringify(error));
              Alert.alert(
                "Error",
                error?.message || "Failed to delete comment",
              );
            }
          },
        },
      ],
    );
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
      <View style={styles.userInfo}>
        <Image
          source={{ uri: comment.user.image || DEFAULT_AVATAR }}
          style={styles.avatar}
        />
        <View style={styles.userDetails}>
          <Text style={styles.username}>{comment.user.name}</Text>
          <Text style={styles.timestamp}>
            ·{" "}
            {formatDistanceToNowStrict(
              new Date(comment.created_at ?? Date.now()),
            )}
          </Text>
        </View>
      </View>

      {isEditing ? (
        <View style={styles.editContainer}>
          <TextInput
            value={editText}
            onChangeText={setEditText}
            multiline
            style={styles.editInput}
            autoFocus
          />
          <View style={styles.editButtons}>
            <Pressable onPress={handleCancelEdit} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={handleSaveEdit}
              style={[
                styles.saveButton,
                editMutation.isPending && { opacity: 0.6 },
              ]}
              disabled={editMutation.isPending}
            >
              <Text style={styles.saveText}>
                {editMutation.isPending ? "Saving..." : "Save"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.commentText}>{comment.comment}</Text>
      )}

      <View style={styles.actionBar}>
        <View style={styles.leftActions}>
          <Pressable
            hitSlop={10}
            onPress={() => handleReplyPress(comment.id, comment.user.name)}
            style={styles.actionIcon}
          >
            <Octicons name="reply" size={16} color={COLORS.textSecondary} />
          </Pressable>

          <Pressable
            hitSlop={10}
            onPress={handleAward}
            style={styles.actionIcon}
            disabled={awardMutation.isPending}
          >
            <MaterialCommunityIcons
              name={hasAwarded ? "trophy" : "trophy-outline"}
              size={20}
              color={hasAwarded ? "#F59E0B" : COLORS.textSecondary}
            />
          </Pressable>

          {isOwner && (
            <Pressable
              hitSlop={10}
              onPress={() => setShowMenu(!showMenu)}
              style={styles.actionIcon}
            >
              <Entypo
                name="dots-three-horizontal"
                size={18}
                color={COLORS.textSecondary}
              />
            </Pressable>
          )}
        </View>

        <View style={styles.votingContainer}>
          <Pressable
            hitSlop={10}
            onPress={handleUpvote}
            disabled={voteMutation.isPending}
          >
            <MaterialCommunityIcons
              name={
                currentVote === "up" ? "arrow-up-bold" : "arrow-up-bold-outline"
              }
              size={22}
              color={
                currentVote === "up" ? COLORS.primary : COLORS.textSecondary
              }
            />
          </Pressable>

          <Text style={styles.voteCount}>{upvotes}</Text>

          <Pressable
            hitSlop={10}
            onPress={handleDownvote}
            disabled={voteMutation.isPending}
          >
            <MaterialCommunityIcons
              name={
                currentVote === "down"
                  ? "arrow-down-bold"
                  : "arrow-down-bold-outline"
              }
              size={22}
              color={currentVote === "down" ? "#DC2626" : COLORS.textSecondary}
            />
          </Pressable>
        </View>
      </View>

      {showMenu && isOwner && (
        <View style={styles.menu}>
          <Pressable onPress={handleEdit} style={styles.menuItem}>
            <MaterialCommunityIcons
              name="pencil"
              size={16}
              color={COLORS.textPrimary}
            />
            <Text style={styles.menuText}>Edit</Text>
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.menuItem}>
            <MaterialCommunityIcons name="delete" size={16} color="#DC2626" />
            <Text style={[styles.menuText, { color: "#DC2626" }]}>Delete</Text>
          </Pressable>
        </View>
      )}

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
    fontSize: 17,
    color: COLORS.textPrimary,
  },
  timestamp: {
    color: "#A3A3A3",
    fontSize: 13,
  },
  commentText: {
    fontSize: 17,
    lineHeight: 20,
    color: "#262626",
  },
  editContainer: {
    gap: 8,
  },
  editInput: {
    backgroundColor: "#F3F4F6",
    padding: 8,
    borderRadius: 8,
    fontSize: 15,
    minHeight: 60,
  },
  editButtons: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#E5E7EB",
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
  },
  cancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  saveText: {
    fontSize: 13,
    fontWeight: "600",
    color: "white",
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
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  menu: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 8,
  },
  menuText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  repliesToggle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.primary,
    marginTop: 2,
  },
});

export default memo(CommentListItem);
