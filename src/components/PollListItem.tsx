import { COLORS } from "@/src/colors";
import { useJoinGroup } from "@/src/hooks/mutations/useGroupMutations";
import { usePollVote } from "@/src/hooks/mutations/usePollMutations";
import { useUserPollVote } from "@/src/hooks/queries/useUserPollVote";
import { Post } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { Link, useRouter } from "expo-router";
import React, { memo } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useDeletePoll } from "../hooks/mutations/usePostMutations";
import SupabaseImage from "./SupabaseImage";

type PollListItemProps = {
  post: Post;
  isDetailedPost?: boolean;
  showJoinButton?: boolean;
  isJoined?: boolean;
};

function PollListItem({
  post,
  isDetailedPost,
  showJoinButton = true,
  isJoined = false,
}: PollListItemProps) {
  const { user } = useUser();
  const router = useRouter();

  // Streak comes from the post prop — no extra DB query per card
  const streak = post.streak ?? 0;

  // Reads the user's current vote on this poll from React Query cache
  const { data: userVote } = useUserPollVote(post.poll?.id || "", user?.id);

  // Mutation hooks
  const pollVoteMutation = usePollVote();
  const joinMutation = useJoinGroup();
  const deletePollMutation = useDeletePoll();

  const isOwner = post.user.id === user?.id;
  const poll = post.poll!;

  // Sum all option vote counts to calculate percentages
  const totalVotes = poll.options.reduce(
    (sum, opt) => sum + (opt.votes_count ?? 0),
    0,
  );

  const pollEnded = false; // Could check poll.ends_at against current date

  // Handles voting on a poll option — optimistic update in usePollVote makes it instant
  const handleVote = async (optionId: string) => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to vote");
      return;
    }
    if (pollEnded) {
      Alert.alert("Poll Ended", "This poll has already ended");
      return;
    }
    try {
      await pollVoteMutation.mutateAsync({
        pollId: poll.id,
        optionId,
        userId: user.id,
      });
    } catch {
      Alert.alert("Error", "Failed to vote. Please try again.");
    }
  };

  // Prompts user to join the community that posted this poll
  const handleJoinCommunity = () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to join communities");
      return;
    }
    Alert.alert("Join Community", `Join ${post.group.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Join",
        onPress: async () => {
          try {
            await joinMutation.mutateAsync({
              groupId: post.group.id,
              userId: user.id,
            });
          } catch {
            Alert.alert("Error", "Failed to join community.");
          }
        },
      },
    ]);
  };

  // Shows delete option for poll owners — confirms before deleting
  const handleOptions = () => {
    if (!isOwner) return;
    Alert.alert("Poll Options", "", [
      {
        text: "Delete Poll",
        style: "destructive",
        onPress: () => {
          Alert.alert(
            "Delete Poll",
            "Are you sure you want to delete this poll?",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    await deletePollMutation.mutateAsync({
                      postId: post.id,
                      userId: user!.id,
                    });
                    Alert.alert("Success", "Poll deleted successfully");
                    // Navigate back if deleting from the detail screen
                    if (isDetailedPost) router.back();
                  } catch {
                    Alert.alert("Error", "Failed to delete poll");
                  }
                },
              },
            ],
          );
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const PollContent = (
    <View style={styles.container}>
      {/* Header: community image, name, streak badge, timestamp, owner/join button */}
      <View style={styles.header}>
        <Image
          source={{
            uri: post.group.image || "https://via.placeholder.com/20",
          }}
          style={styles.groupImage}
        />

        <View style={styles.headerInfo}>
          <View style={styles.headerRow}>
            <Text style={styles.groupName}>{post.group.name}</Text>

            {/* Fire streak badge — only shows when streak > 0 */}
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={14} color="#FF6A00" />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}

            <Text style={styles.timeText}>
              {formatDistanceToNowStrict(
                new Date(post.created_at ?? Date.now()),
              )}
            </Text>
          </View>

          {/* Author name only shown on the detail screen */}
          {isDetailedPost && (
            <Text style={styles.authorName}>{post.user.name}</Text>
          )}
        </View>

        {/* Options menu for owner, join button for non-members */}
        {isOwner ? (
          <Pressable onPress={handleOptions} hitSlop={10}>
            <Feather
              name="more-vertical"
              size={20}
              color={COLORS.textSecondary}
            />
          </Pressable>
        ) : showJoinButton && !isJoined ? (
          <Pressable onPress={handleJoinCommunity} style={styles.joinButton}>
            <Text style={styles.joinButtonText}>Join</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Poll question shown with a poll icon */}
      <View style={styles.pollHeader}>
        <MaterialCommunityIcons
          name="poll"
          size={20}
          color={COLORS.primary}
          style={styles.pollIcon}
        />
        <Text style={styles.question}>{poll.question}</Text>
      </View>

      {/* Poll options — each shows a progress bar after user votes */}
      <View style={styles.optionsContainer}>
        {poll.options.map((option) => {
          const votes = option.votes_count ?? 0;
          // Calculate this option's share of the total votes as a percentage
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          const isSelected = userVote === option.id;
          const hasVoted = !!userVote;

          return (
            <Pressable
              key={option.id}
              onPress={() => handleVote(option.id)}
              // Disable voting after user has voted or poll has ended
              disabled={hasVoted || pollEnded || pollVoteMutation.isPending}
              style={[
                styles.option,
                hasVoted && styles.optionVoted,
                isSelected && styles.optionSelected,
              ]}
            >
              {/* Progress bar shown behind option text after voting */}
              {hasVoted && (
                <View
                  style={[
                    styles.progressBar,
                    { width: `${percentage}%` },
                    isSelected && styles.progressBarSelected,
                  ]}
                />
              )}

              <View style={styles.optionContent}>
                {/* Optional image for this poll option */}
                {option.image_url && (
                  <SupabaseImage
                    path={option.image_url}
                    style={styles.optionImage}
                  />
                )}
                <Text
                  style={[
                    styles.optionText,
                    isSelected && styles.optionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>

                {/* Percentage and check mark shown after voting */}
                {hasVoted && (
                  <View style={styles.voteStats}>
                    {isSelected && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={16}
                        color={COLORS.primary}
                      />
                    )}
                    <Text
                      style={[
                        styles.percentage,
                        isSelected && styles.percentageSelected,
                      ]}
                    >
                      {percentage.toFixed(0)}%
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Total vote count shown below options */}
      <Text style={styles.totalVotes}>
        {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        {pollEnded && " • Poll ended"}
      </Text>
    </View>
  );

  // In feed: wrap in Link for navigation. In detail view: render content directly.
  if (isDetailedPost) return PollContent;
  return (
    <Link href={`/post/${post.id}`} asChild>
      <Pressable style={{ width: "100%" }}>{PollContent}</Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 7,
    borderBottomColor: COLORS.border,
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
  pollHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  pollIcon: {
    marginRight: 6,
  },
  question: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
  optionsContainer: {
    gap: 10,
    marginTop: 12,
  },
  option: {
    position: "relative",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    minHeight: 48,
  },
  optionVoted: {
    borderColor: "#D1D5DB",
  },
  optionSelected: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  progressBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#F3F4F6",
  },
  progressBarSelected: {
    backgroundColor: `${COLORS.primary}20`,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
    zIndex: 1,
  },
  optionImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  optionTextSelected: {
    fontWeight: "600",
  },
  voteStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  percentage: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  percentageSelected: {
    color: COLORS.primary,
  },
  totalVotes: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
});

// Custom memo comparator — only re-renders this card when values it displays have changed.
// Checks poll option vote counts individually since they update on voting.
export default memo(PollListItem, (prev, next) => {
  if (
    prev.post.id !== next.post.id ||
    prev.post.nr_of_comments !== next.post.nr_of_comments ||
    prev.post.streak !== next.post.streak ||
    prev.isJoined !== next.isJoined ||
    prev.isDetailedPost !== next.isDetailedPost
  ) {
    return false; // props changed — re-render
  }

  // Check if any individual poll option vote count changed
  const prevOptions = prev.post.poll?.options ?? [];
  const nextOptions = next.post.poll?.options ?? [];
  if (prevOptions.length !== nextOptions.length) return false;
  for (let i = 0; i < prevOptions.length; i++) {
    if (prevOptions[i].votes_count !== nextOptions[i].votes_count) return false;
  }

  return true; // nothing relevant changed — skip re-render
});
