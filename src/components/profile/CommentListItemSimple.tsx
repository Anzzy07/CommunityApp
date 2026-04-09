import { COLORS } from "@/src/colors";
import { Comment } from "@/src/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  comment: Comment;
};

export default function CommentListItemSimple({ comment }: Props) {
  const router = useRouter();

  const handlePress = () => {
    // Navigate to the post where this comment was made
    router.push(`/post/${comment.post_id}`);
  };

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      {/* User Info */}
      <View style={styles.header}>
        <Image
          source={{
            uri: comment.user.image || "https://via.placeholder.com/32",
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.username}>{comment.user.name}</Text>
          <Text style={styles.timestamp}>
            {formatDistanceToNowStrict(
              new Date(comment.created_at ?? Date.now()),
            )}{" "}
            ago
          </Text>
        </View>
      </View>

      {/* Comment Text */}
      <Text numberOfLines={3} style={styles.commentText}>
        {comment.comment}
      </Text>

      {/* Footer with upvotes */}
      <View style={styles.footer}>
        <View style={styles.voteContainer}>
          <MaterialCommunityIcons
            name="arrow-up-bold"
            size={16}
            color={COLORS.textSecondary}
          />
          <Text style={styles.voteCount}>{comment.upvotes ?? 0}</Text>
        </View>
        <Text style={styles.viewPost}>View post →</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    gap: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  timestamp: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  commentText: {
    fontSize: 18,
    lineHeight: 20,
    color: COLORS.textPrimary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voteContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  voteCount: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  viewPost: {
    fontSize: 17,
    color: COLORS.primary,
    fontWeight: "500",
  },
});
