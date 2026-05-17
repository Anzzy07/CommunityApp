import { COLORS } from "@/src/colors";
import { useVoteChallengeEntry } from "@/src/hooks/mutations/useChallengeEntryMutations";
import { useSupabaseChallengeEntryVote } from "@/src/hooks/queries/useSupabaseChallengeEntryVote";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import SupabaseImage from "./SupabaseImage";

type ChallengeEntry = {
  id: string;
  challenge_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  votes: number;
  created_at: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
};

type Props = {
  entry: ChallengeEntry;
  challengeId: string;
  onDelete?: () => void;
  // rank is 1-based position in the leaderboard — only passed after challenge ends
  rank?: number;
  isWinner?: boolean;
  isExpired?: boolean;
};

// Returns medal emoji, text colour, and background colour based on leaderboard rank
function getRankStyle(rank: number): {
  emoji: string;
  color: string;
  bg: string;
} {
  if (rank === 1) return { emoji: "🥇", color: "#B8860B", bg: "#FEF9E7" };
  if (rank === 2) return { emoji: "🥈", color: "#6B7280", bg: "#F3F4F6" };
  if (rank === 3) return { emoji: "🥉", color: "#92400E", bg: "#FEF3C7" };
  // Default style for entries ranked 4th and below
  return {
    emoji: `#${rank}`,
    color: COLORS.textSecondary,
    bg: COLORS.background,
  };
}

export default function ChallengeEntryCard({
  entry,
  challengeId,
  onDelete,
  rank,
  isWinner = false,
  isExpired = false,
}: Props) {
  // Get the currently authenticated user from Clerk
  const { user } = useUser();

  // Mutation hook for casting a vote on this entry
  const voteMutation = useVoteChallengeEntry();

  // Fetch the current user's vote on this specific entry (up, down, or null)
  const { data: currentVote } = useSupabaseChallengeEntryVote(
    entry.id,
    user?.id,
  );

  // Check if the current user owns this entry to show delete and edit controls
  const isOwner = user?.id === entry.user_id;

  // Get rank styling if a rank has been provided (only on expired challenges)
  const rankStyle = rank ? getRankStyle(rank) : null;

  // Handles upvote and downvote actions on this entry
  // Voting is blocked once the challenge has ended
  const handleVote = async (voteType: "up" | "down") => {
    if (isExpired) {
      Alert.alert("Voting ended", "This challenge has already ended");
      return;
    }

    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to vote");
      return;
    }

    try {
      await voteMutation.mutateAsync({
        entryId: entry.id,
        userId: user.id,
        voteType,
        challengeId,
      });
    } catch {
      Alert.alert("Error", "Failed to vote");
    }
  };

  // Shows a confirmation alert before triggering the delete callback
  const handleDelete = () => {
    if (!onDelete) return;
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: onDelete },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        // Apply winner border and shadow when this entry won the challenge
        isWinner && styles.winnerContainer,
        // Apply rank background colour based on leaderboard position
        rankStyle && { backgroundColor: rankStyle.bg },
      ]}
    >
      {/* Gold top bar decoration shown only on the winning entry */}
      {isWinner && <View style={styles.winnerBar} />}

      {/* Rank badge shown after challenge ends to indicate leaderboard position */}
      {rank && rankStyle && (
        <View style={[styles.rankBadge, { borderColor: rankStyle.color }]}>
          <Text style={[styles.rankEmoji]}>{rankStyle.emoji}</Text>
          <Text style={[styles.rankText, { color: rankStyle.color }]}>
            {rank === 1
              ? "Winner"
              : rank === 2
                ? "2nd Place"
                : rank === 3
                  ? "3rd Place"
                  : `#${rank}`}
          </Text>
        </View>
      )}

      {/* Entry header showing user avatar, name, timestamp, and delete button for owner */}
      <View style={styles.header}>
        <Image
          source={{
            uri: entry.user.image || "https://via.placeholder.com/40",
          }}
          style={[styles.avatar, isWinner && styles.winnerAvatar]}
        />
        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.userName}>{entry.user.name}</Text>
            {/* Crown icon displayed next to the winner's name */}
            {isWinner && (
              <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" />
            )}
          </View>
          <Text style={styles.timestamp}>
            {formatDistanceToNowStrict(new Date(entry.created_at))} ago
          </Text>
        </View>

        {/* Delete button only shown to the entry owner */}
        {isOwner && onDelete && (
          <Pressable onPress={handleDelete} hitSlop={10}>
            <MaterialCommunityIcons
              name="delete-outline"
              size={20}
              color="#DC2626"
            />
          </Pressable>
        )}
      </View>

      {/* Entry text content — only rendered if the user wrote a caption */}
      {entry.content && <Text style={styles.content}>{entry.content}</Text>}

      {/* Entry image loaded from Supabase Storage using the stored path */}
      {entry.image_url && (
        <SupabaseImage path={entry.image_url} style={styles.image} />
      )}

      {/* Footer row with upvote/downvote controls and a vote count pill for ranked entries */}
      <View style={styles.footer}>
        <View style={styles.voteContainer}>
          {/* Upvote button — filled icon shown when the user has upvoted */}
          <Pressable
            onPress={() => handleVote("up")}
            disabled={voteMutation.isPending}
            hitSlop={10}
          >
            <MaterialCommunityIcons
              name={
                currentVote === "up" ? "arrow-up-bold" : "arrow-up-bold-outline"
              }
              size={20}
              color={
                currentVote === "up" ? COLORS.primary : COLORS.textSecondary
              }
            />
          </Pressable>

          {/* Total vote count displayed between the upvote and downvote buttons */}
          <Text style={styles.voteCount}>{entry.votes ?? 0}</Text>

          {/* Downvote button — filled icon shown when the user has downvoted */}
          <Pressable
            onPress={() => handleVote("down")}
            disabled={voteMutation.isPending}
            hitSlop={10}
          >
            <MaterialCommunityIcons
              name={
                currentVote === "down"
                  ? "arrow-down-bold"
                  : "arrow-down-bold-outline"
              }
              size={20}
              color={currentVote === "down" ? "#DC2626" : COLORS.textSecondary}
            />
          </Pressable>
        </View>

        {/* Vote tally pill shown on ranked entries after the challenge ends */}
        {rank && (
          <View style={styles.votePill}>
            <MaterialCommunityIcons
              name="thumb-up"
              size={13}
              color={COLORS.primary}
            />
            <Text style={styles.votePillText}>{entry.votes ?? 0} votes</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: "hidden",
  },
  winnerContainer: {
    borderWidth: 2,
    borderColor: "#F59E0B",
    shadowColor: "#F59E0B",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  winnerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#F59E0B",
  },
  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
    gap: 5,
  },
  rankEmoji: {
    fontSize: 15,
  },
  rankText: {
    fontSize: 13,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  winnerAvatar: {
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  userName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: 250,
    borderRadius: 12,
    marginBottom: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  voteContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  voteCount: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    minWidth: 30,
    textAlign: "center",
  },
  votePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  votePillText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
