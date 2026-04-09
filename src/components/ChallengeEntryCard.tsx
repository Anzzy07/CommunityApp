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
  // rank is 1-based position in the leaderboard (1 = winner, 2 = 2nd, 3 = 3rd)
  // only passed when challenge has ended
  rank?: number;
  isWinner?: boolean;
  isExpired?: boolean;
};

// Returns medal emoji and colour for rank 1/2/3
function getRankStyle(rank: number): {
  emoji: string;
  color: string;
  bg: string;
} {
  if (rank === 1) return { emoji: "🥇", color: "#B8860B", bg: "#FEF9E7" };
  if (rank === 2) return { emoji: "🥈", color: "#6B7280", bg: "#F3F4F6" };
  if (rank === 3) return { emoji: "🥉", color: "#92400E", bg: "#FEF3C7" };
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
  const { user } = useUser();
  const voteMutation = useVoteChallengeEntry();

  const { data: currentVote } = useSupabaseChallengeEntryVote(
    entry.id,
    user?.id,
  );

  const isOwner = user?.id === entry.user_id;
  const rankStyle = rank ? getRankStyle(rank) : null;

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
        isWinner && styles.winnerContainer,
        rankStyle && { backgroundColor: rankStyle.bg },
      ]}
    >
      {/* Rank badge — shown when challenge has ended */}
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

      {/* Winner crown glow bar */}
      {isWinner && <View style={styles.winnerBar} />}

      {/* Entry header */}
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
            {isWinner && (
              <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" />
            )}
          </View>
          <Text style={styles.timestamp}>
            {formatDistanceToNowStrict(new Date(entry.created_at))} ago
          </Text>
        </View>

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

      {entry.content && <Text style={styles.content}>{entry.content}</Text>}

      {entry.image_url && (
        <SupabaseImage path={entry.image_url} style={styles.image} />
      )}

      <View style={styles.footer}>
        <View style={styles.voteContainer}>
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

          <Text style={styles.voteCount}>{entry.votes ?? 0}</Text>

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

        {/* Vote tally pill — shown when ranked */}
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
