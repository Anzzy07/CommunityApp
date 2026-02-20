import userStreaks from "@/assets/data/userStreaks.json";
import { COLORS } from "@/src/colors";
import { Post } from "@/src/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { Link } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PostListItemProps = {
  post: Post;
  isDetailedPost?: boolean;
  showJoinButton?: boolean;
  isJoined?: boolean;
};

export default function PostListItem({
  post,
  isDetailedPost,
  showJoinButton = true,
  isJoined = false,
}: PostListItemProps) {
  // Local state for vote tracking
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [voteStatus, setVoteStatus] = useState<"up" | "down" | null>(null);
  const [hasAwarded, setHasAwarded] = useState(false);

  // Get user's streak data
  const streak = userStreaks.find((s) => s.user_id === post.user.id);

  // Determine what to show based on post type and view mode
  const shouldShowImage = isDetailedPost || post.image;
  const shouldShowDescription = isDetailedPost || !post.image;

  //Toggles upvote state and updates count
  const handleUpvote = () => {
    if (voteStatus === "up") {
      // Remove upvote
      setUpvotes(upvotes - 1);
      setVoteStatus(null);
    } else {
      // Add upvote
      setUpvotes(voteStatus === "down" ? upvotes + 2 : upvotes + 1);
      setVoteStatus("up");
    }
  };

  // Toggles downvote state and updates count

  const handleDownvote = () => {
    if (voteStatus === "down") {
      // Remove downvote
      setUpvotes(upvotes + 1);
      setVoteStatus(null);
    } else {
      // Add downvote
      setUpvotes(voteStatus === "up" ? upvotes - 2 : upvotes - 1);
      setVoteStatus("down");
    }
  };

  // Uses native share functionality

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${post.title}\n\nCheck out this post in ${post.group.name}!`,
        title: post.title,
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  // Shows confirmation and toggles award state

  const handleAward = () => {
    if (hasAwarded) {
      setHasAwarded(false);
      Alert.alert("Award Removed", "You removed your award from this post");
    } else {
      setHasAwarded(true);
      Alert.alert("Award Given!", "You gave an award to this post! 🏆");
    }
  };

  // Need to implement join functionality

  const handleJoinCommunity = () => {
    Alert.alert("Join Community", `Join ${post.group.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Join",
        onPress: () => {
          console.log("Joined community:", post.group.id);
          // For this - Add to groupMembers atom
        },
      },
    ]);
  };

  // Post content wrapper
  const PostContent = (
    <View style={styles.container}>
      {/*  Group info and user */}
      <View style={styles.header}>
        <Image source={{ uri: post.group.image }} style={styles.groupImage} />

        <View style={styles.headerInfo}>
          <View style={styles.headerRow}>
            {/* Group name */}
            <Text style={styles.groupName}>{post.group.name}</Text>

            {/* User streak */}
            {streak && streak.current_streak > 0 && (
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={14} color="#FF6A00" />
                <Text style={styles.streakText}>{streak.current_streak}</Text>
              </View>
            )}

            {/* Time ago */}
            <Text style={styles.timeText}>
              {formatDistanceToNowStrict(new Date(post.created_at))}
            </Text>
          </View>

          {/* Author name  */}
          {isDetailedPost && (
            <Text style={styles.authorName}>{post.user.name}</Text>
          )}
        </View>

        {/* Join button */}
        {showJoinButton && !isJoined && (
          <Pressable onPress={handleJoinCommunity} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Join</Text>
          </Pressable>
        )}
      </View>

      {/* Title, image, description */}
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

      {/*  Interactions */}
      <View style={styles.footer}>
        <View style={styles.leftActions}>
          {/* Voting */}
          <View style={styles.voteContainer}>
            <Pressable onPress={handleUpvote} hitSlop={10}>
              <MaterialCommunityIcons
                name={
                  voteStatus === "up"
                    ? "arrow-up-bold"
                    : "arrow-up-bold-outline"
                }
                size={19}
                color={voteStatus === "up" ? COLORS.primary : COLORS.border}
              />
            </Pressable>

            <Text style={styles.voteCount}>{upvotes}</Text>

            <View style={styles.voteDivider} />

            <Pressable onPress={handleDownvote} hitSlop={10}>
              <MaterialCommunityIcons
                name={
                  voteStatus === "down"
                    ? "arrow-down-bold"
                    : "arrow-down-bold-outline"
                }
                size={19}
                color={voteStatus === "down" ? "#DC2626" : COLORS.border}
              />
            </Pressable>
          </View>

          {/* Comments */}
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
          {/* Award/Trophy */}
          <Pressable onPress={handleAward} hitSlop={10}>
            <MaterialCommunityIcons
              name={hasAwarded ? "trophy" : "trophy-outline"}
              size={19}
              color={hasAwarded ? "#F59E0B" : COLORS.border}
              style={styles.iconButton}
            />
          </Pressable>

          {/* Share */}
          <Pressable onPress={handleShare} hitSlop={10}>
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

  // Wrap with Link for navigation
  if (isDetailedPost) {
    return PostContent;
  }

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
