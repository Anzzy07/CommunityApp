import userStreaks from "@/assets/data/userStreaks.json";
import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { COLORS } from "@/src/colors";
import {
  usePostAward,
  usePostShare,
  usePostVote,
} from "@/src/hooks/mutations/usePostMutations";
import { Post } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { Link } from "expo-router";
import { useSetAtom } from "jotai";
import React, { memo } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  useUserPostAward,
  useUserPostVote,
} from "../hooks/mutations/useUserVotes";

type PostListItemProps = {
  post: Post;
  isDetailedPost?: boolean;
  showJoinButton?: boolean;
  isJoined?: boolean;
};

function PostListItem({
  post,
  isDetailedPost,
  showJoinButton = true,
  isJoined = false,
}: PostListItemProps) {
  const { user } = useUser();
  const setGroupMembers = useSetAtom(groupMembersAtom);

  // These are the source of truth — driven by React Query cache
  const { data: voteStatus } = useUserPostVote(post.id, user?.id);
  const { data: hasAwarded } = useUserPostAward(post.id, user?.id);

  const voteMutation = usePostVote();
  const awardMutation = usePostAward();
  const shareMutation = usePostShare();

  // Read upvotes directly from the post prop — which is driven by the React Query cache
  // (optimistically updated in usePostVote). No local state needed — avoids drift.
  const upvotes = post.upvotes ?? 0;
  const awarded = hasAwarded ?? false;
  const currentVote = voteStatus ?? null;

  const streak = userStreaks.find((s) => s.user_id === post.user.id);
  const shouldShowImage = isDetailedPost || post.image;
  const shouldShowDescription = isDetailedPost || !post.image;

  const handleUpvote = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to vote");
      return;
    }
    try {
      await voteMutation.mutateAsync({
        postId: post.id,
        userId: user.id,
        voteType: "up",
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
        postId: post.id,
        userId: user.id,
        voteType: "down",
      });
    } catch {
      Alert.alert("Error", "Failed to vote. Please try again.");
    }
  };

  const handleShare = async () => {
    try {
      await shareMutation.mutateAsync({
        postId: post.id,
        postTitle: post.title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleAward = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to give awards");
      return;
    }
    try {
      await awardMutation.mutateAsync({
        postId: post.id,
        userId: user.id,
        remove: awarded,
      });
      if (!awarded)
        Alert.alert("Award Given!", "You gave an award to this post! 🏆");
    } catch {
      Alert.alert("Error", "Failed to give award. Please try again.");
    }
  };

  const handleJoinCommunity = () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to join communities");
      return;
    }
    Alert.alert("Join Community", `Join ${post.group.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Join",
        onPress: () => {
          setGroupMembers((prev) => [
            ...prev,
            {
              id: `gm-${Date.now()}`,
              group_id: post.group.id,
              user_id: user.id,
              joined_at: new Date().toISOString(),
            },
          ]);
        },
      },
    ]);
  };

  const PostContent = (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={{ uri: post.group.image }} style={styles.groupImage} />

        <View style={styles.headerInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.groupName}>{post.group.name}</Text>

            {streak && streak.current_streak > 0 && (
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={14} color="#FF6A00" />
                <Text style={styles.streakText}>{streak.current_streak}</Text>
              </View>
            )}

            <Text style={styles.timeText}>
              {formatDistanceToNowStrict(
                new Date(post.created_at ?? Date.now()),
              )}
            </Text>
          </View>

          {isDetailedPost && (
            <Text style={styles.authorName}>{post.user.name}</Text>
          )}
        </View>

        {showJoinButton && !isJoined && (
          <Pressable onPress={handleJoinCommunity} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Join</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.title}>{post.title}</Text>

      {shouldShowImage && post.image && (
        <Image source={{ uri: post.image }} style={styles.postImage} />
      )}

      {shouldShowDescription && post.description && (
        <Text
          numberOfLines={isDetailedPost ? undefined : 4}
          style={styles.description}
        >
          {post.description}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.leftActions}>
          <View style={styles.voteContainer}>
            <Pressable
              onPress={handleUpvote}
              hitSlop={10}
              disabled={voteMutation.isPending}
            >
              <MaterialCommunityIcons
                name={
                  currentVote === "up"
                    ? "arrow-up-bold"
                    : "arrow-up-bold-outline"
                }
                size={19}
                color={currentVote === "up" ? COLORS.primary : COLORS.border}
              />
            </Pressable>

            <Text style={styles.voteCount}>{upvotes}</Text>

            <View style={styles.voteDivider} />

            <Pressable
              onPress={handleDownvote}
              hitSlop={10}
              disabled={voteMutation.isPending}
            >
              <MaterialCommunityIcons
                name={
                  currentVote === "down"
                    ? "arrow-down-bold"
                    : "arrow-down-bold-outline"
                }
                size={19}
                color={currentVote === "down" ? "#DC2626" : COLORS.border}
              />
            </Pressable>
          </View>

          <View style={styles.actionButton}>
            <MaterialCommunityIcons
              name="comment-outline"
              size={19}
              color={COLORS.border}
            />
            <Text style={styles.actionText}>{post.nr_of_comments}</Text>
          </View>
        </View>

        <View style={styles.rightActions}>
          <Pressable
            onPress={handleAward}
            hitSlop={10}
            disabled={awardMutation.isPending}
          >
            <MaterialCommunityIcons
              name={awarded ? "trophy" : "trophy-outline"}
              size={19}
              color={awarded ? "#F59E0B" : COLORS.border}
              style={styles.iconButton}
            />
          </Pressable>

          <Pressable
            onPress={handleShare}
            hitSlop={10}
            disabled={shareMutation.isPending}
          >
            <MaterialCommunityIcons
              name="share-outline"
              size={19}
              color={COLORS.border}
              style={styles.iconButton}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );

  if (isDetailedPost) return PostContent;
  return <Link href={`/post/${post.id}`}>{PostContent}</Link>;
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 7,
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 0.5,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 5,
  },
  headerInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  groupName: {
    fontWeight: "bold",
    fontSize: 13,
    color: "#3A3B3C",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakText: {
    fontSize: 12,
    color: "#FF6A00",
    fontWeight: "600",
  },
  timeText: {
    color: "grey",
    fontSize: 13,
  },
  authorName: {
    fontSize: 13,
    color: COLORS.primary,
    marginTop: 2,
  },
  joinButton: {
    marginLeft: "auto",
    backgroundColor: COLORS.button,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  joinButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  title: {
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
  postImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 15,
  },
  description: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftActions: {
    flexDirection: "row",
    gap: 10,
  },
  voteContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  voteCount: {
    fontWeight: "500",
    marginHorizontal: 5,
    color: COLORS.textPrimary,
  },
  voteDivider: {
    width: 1,
    backgroundColor: "#D4D4D4",
    height: 14,
    marginHorizontal: 7,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  actionText: {
    fontWeight: "500",
    marginLeft: 5,
    color: COLORS.textPrimary,
  },
  rightActions: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    borderWidth: 0.5,
    borderColor: COLORS.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
});

export default memo(PostListItem);
