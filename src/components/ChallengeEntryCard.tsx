import { COLORS } from "@/src/colors";
import { useVoteChallengeEntry } from "@/src/hooks/mutations/useChallengeEntryMutations";
import { useSupabaseChallengeEntryVote } from "@/src/hooks/queries/useSupabaseChallengeEntryVote";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

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
  onDelete?: () => void;
};

export default function ChallengeEntryCard({ entry, onDelete }: Props) {
  const { user } = useUser();
  const voteMutation = useVoteChallengeEntry();

  // Get user's current vote from database
  const { data: currentVote } = useSupabaseChallengeEntryVote(
    entry.id,
    user?.id,
  );

  const isOwner = user?.id === entry.user_id;

  const handleVote = async (voteType: "up" | "down") => {
    // console.log("Vote clicked:", voteType, "Entry ID:", entry.id);

    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to vote");
      return;
    }

    // console.log("User ID:", user.id, "Current vote:", currentVote);

    try {
      const result = await voteMutation.mutateAsync({
        entryId: entry.id,
        userId: user.id,
        voteType,
      });
      // console.log(":) Vote result:", result);
    } catch (error) {
      console.error(":( Vote error:", error);
      Alert.alert("Error", "Failed to vote");
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      Alert.alert(
        "Delete Entry",
        "Are you sure you want to delete this entry?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              console.log("🗑️ Executing delete...");
              onDelete();
            },
          },
        ],
      );
    } else {
      console.log(":( onDelete is undefined");
    }
  };

  return (
    <View style={styles.container}>
      {/* User Info */}
      <View style={styles.header}>
        <Image
          source={{
            uri: entry.user.image || "https://via.placeholder.com/40",
          }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{entry.user.name}</Text>
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

      {/* Content */}
      {entry.content && <Text style={styles.content}>{entry.content}</Text>}

      {/* Image */}
      {entry.image_url && (
        <Image source={{ uri: entry.image_url }} style={styles.image} />
      )}

      {/*  Votes */}
      <View style={styles.footer}>
        <View style={styles.voteContainer}>
          {/* Upvote */}
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

          {/* Downvote */}
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  userInfo: {
    flex: 1,
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
});
