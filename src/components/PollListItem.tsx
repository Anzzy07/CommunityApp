import { COLORS } from "@/src/colors";
import { useJoinGroup } from "@/src/hooks/mutations/useGroupMutations";
import { usePollVote } from "@/src/hooks/mutations/usePollMutations";
import { useUserPollVote } from "@/src/hooks/queries/useUserPollVote";
import { Post } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict } from "date-fns";
import { Link, useRouter } from "expo-router";
import React from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useDeletePoll } from "../hooks/mutations/usePostMutations";
import SupabaseImage from "./SupabaseImage";

type PollListItemProps = {
  post: Post;
  isDetailedPost?: boolean;
  showJoinButton?: boolean;
  isJoined?: boolean;
};

export default function PollListItem({
  post,
  isDetailedPost,
  showJoinButton = true,
  isJoined = false,
}: PollListItemProps) {
  // Get the currently authenticated user from Clerk
  const { user } = useUser();
  const router = useRouter();

  // Use 0 as default if streak is not available on this post
  const streak = post.streak ?? 0;

  // Fetch the option ID the current user voted for on this poll
  // Returns null or undefined if the user has not voted yet
  const { data: userVote, isLoading: isLoadingVote } = useUserPollVote(
    post.poll?.id || "",
    user?.id,
  );

  // Mutations for voting, joining a community, and deleting a poll
  const pollVoteMutation = usePollVote();
  const joinMutation = useJoinGroup();
  const deletePollMutation = useDeletePoll();

  // Check if the current user is the owner of this post
  const isOwner = post.user.id === user?.id;
  const poll = post.poll!;

  // Calculate total votes across all options to compute percentages
  const totalVotes = poll.options.reduce(
    (sum, opt) => sum + (opt.votes_count ?? 0),
    0,
  );

  // Consider the user as having voted only after the vote has loaded from cache
  // Prevents showing results before the vote status is confirmed
  const hasVoted =
    userVote !== null && userVote !== undefined && !isLoadingVote;

  // Check if the poll end date has passed using the ends_at field from the database
  // Previously hardcoded to false which prevented ended polls from showing final results
  const pollEnded = poll.ends_at ? new Date(poll.ends_at) < new Date() : false;

  // Show results if the user has already voted or if the poll has ended
  const showResults = hasVoted || pollEnded;

  // Returns a human-readable label showing how much time is left or that the poll ended
  const getTimeLabel = () => {
    if (!poll.ends_at) return null;
    const endsAt = new Date(poll.ends_at);
    if (pollEnded) {
      return "Poll ended";
    }
    return `Ends ${formatDistanceToNowStrict(endsAt, { addSuffix: true })}`;
  };

  // Handles a vote action on a poll option
  // Prevents voting if the poll has ended or a vote mutation is already in progress
  const handleVote = async (optionId: string) => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to vote");
      return;
    }
    if (pollEnded) {
      Alert.alert(
        "Poll Ended",
        "This poll has already ended. Results are shown below.",
      );
      return;
    }
    // Prevent duplicate vote submissions while a mutation is pending
    if (pollVoteMutation.isPending) return;

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

  // Handles the join community action when a user taps Join on a poll card
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

  // Shows the poll options menu to the post owner
  // Only the owner can see and trigger delete actions on their own poll
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
                    // Navigate back if the poll was deleted from the detail screen
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

  // Identify the winning option on ended polls by finding the option with the highest vote count
  // Used to display a crown icon on the winning option
  const winnerOptionId =
    pollEnded && totalVotes > 0
      ? poll.options.reduce((best, opt) =>
          (opt.votes_count ?? 0) > (best.votes_count ?? 0) ? opt : best,
        ).id
      : null;

  const PollContent = (
    <View style={styles.container}>
      {/* Header row showing community image, name, streak badge, and timestamp */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push(`/community/${post.group.id}`)}
          hitSlop={10}
        >
          <Image
            source={{
              uri: post.group.image || "https://via.placeholder.com/20",
            }}
            style={styles.groupImage}
          />
        </Pressable>

        <View style={styles.headerInfo}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => router.push(`/community/${post.group.id}`)}
            >
              <Text style={styles.groupName}>{post.group.name}</Text>
            </Pressable>

            {/* Only show the streak badge if the user has an active streak */}
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <MaterialCommunityIcons name="fire" size={16} color="#FF6A00" />
                <Text style={styles.streakText}>{streak}</Text>
              </View>
            )}

            <Text style={styles.timeText}>
              {formatDistanceToNowStrict(
                new Date(post.created_at ?? Date.now()),
              )}
            </Text>
          </View>

          {/* Author name is only shown on the detailed post view */}
          {isDetailedPost && (
            <Text style={styles.authorName}>{post.user.name}</Text>
          )}
        </View>

        {/* Show options menu for owner, or Join button for non-members */}
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

      {/* Poll question displayed with a poll icon */}
      <View style={styles.pollHeader}>
        <MaterialCommunityIcons
          name="poll"
          size={20}
          color={COLORS.primary}
          style={styles.pollIcon}
        />
        <Text style={styles.question}>{poll.question}</Text>
      </View>

      {/* Banner shown when the poll has ended to inform users results are final */}
      {pollEnded && (
        <View style={styles.endedBanner}>
          <MaterialCommunityIcons
            name="check-circle"
            size={14}
            color="#6B7280"
          />
          <Text style={styles.endedText}>
            This poll has ended — final results below
          </Text>
        </View>
      )}

      {/* Render each poll option as a pressable row */}
      <View style={styles.optionsContainer}>
        {poll.options.map((option) => {
          // Calculate the percentage of votes this option has received
          const votes = option.votes_count ?? 0;
          const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

          // Check if this option is the one the current user selected
          const isSelected = userVote === option.id;

          // Check if this option is the winner on an ended poll
          const isWinner = option.id === winnerOptionId;

          return (
            <Pressable
              key={option.id}
              onPress={() => handleVote(option.id)}
              // Disable interaction once the user has voted or the poll has ended
              disabled={showResults || pollVoteMutation.isPending}
              style={[
                styles.option,
                showResults && styles.optionVoted,
                isSelected && styles.optionSelected,
                isWinner && styles.optionWinner,
              ]}
            >
              {/* Progress bar rendered behind the option text to show vote share */}
              {showResults && (
                <View
                  style={[
                    styles.progressBar,
                    { width: `${percentage}%` },
                    isSelected && styles.progressBarSelected,
                    isWinner && styles.progressBarWinner,
                  ]}
                />
              )}

              <View style={styles.optionContent}>
                {/* Optional image attached to a poll option */}
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

                {/* Show vote percentage and status icons after voting or when poll ends */}
                {showResults && (
                  <View style={styles.voteStats}>
                    {/* Crown icon shown on the winning option of an ended poll */}
                    {isWinner && pollEnded && (
                      <MaterialCommunityIcons
                        name="crown"
                        size={16}
                        color="#F59E0B"
                      />
                    )}
                    {/* Check icon shown on the option the user selected */}
                    {isSelected && !pollEnded && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={16}
                        color={COLORS.primary}
                      />
                    )}
                    {isSelected && pollEnded && (
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
                        isWinner && styles.percentageWinner,
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

      {/* Footer showing total vote count and time remaining or ended label */}
      <View style={styles.pollFooter}>
        <Text style={styles.totalVotes}>
          {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
        </Text>
        {getTimeLabel() && (
          <Text style={[styles.timeLabel, pollEnded && styles.timeLabelEnded]}>
            {getTimeLabel()}
          </Text>
        )}
      </View>
    </View>
  );

  // Return content directly if this is the detailed post view
  // Otherwise wrap it in a Link so tapping navigates to the post detail screen
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
    borderBottomWidth: 0.8,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 18,
    color: "#3A3B3C",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  streakText: {
    fontSize: 16,
    color: "#FF6A00",
    fontWeight: "600",
  },
  timeText: {
    color: "grey",
    fontSize: 14,
  },
  authorName: {
    fontSize: 15,
    color: COLORS.primary,
    marginTop: 2,
  },
  joinButton: {
    marginLeft: "auto",
    backgroundColor: COLORS.button,
    borderRadius: 16,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  joinButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 15,
  },
  pollHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  pollIcon: {
    marginRight: 8,
  },
  question: {
    flex: 1,
    fontWeight: "bold",
    fontSize: 18,
    letterSpacing: 0.5,
    color: COLORS.textPrimary,
  },
  endedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  endedText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  optionsContainer: {
    gap: 10,
    marginTop: 4,
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
  optionWinner: {
    borderColor: "#F59E0B",
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
  progressBarWinner: {
    backgroundColor: "#FEF3C720",
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
    fontSize: 17,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  optionTextSelected: {
    fontWeight: "600",
  },
  voteStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  percentage: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  percentageSelected: {
    color: COLORS.primary,
  },
  percentageWinner: {
    color: "#F59E0B",
  },
  pollFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  totalVotes: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  timeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  timeLabelEnded: {
    color: "#9CA3AF",
  },
});
