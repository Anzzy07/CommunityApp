import { COLORS } from "@/src/colors";
import ChallengeEntryCard from "@/src/components/ChallengeEntryCard";
import {
  useDeleteChallengeEntry,
  useSubmitChallengeEntry,
  useUpdateChallengeEntry,
} from "@/src/hooks/mutations/useChallengeEntryMutations";
import {
  useSupabaseChallengeEntries,
  useSupabaseChallengeEntriesCount,
  useSupabaseUserChallengeEntry,
} from "@/src/hooks/queries/useSupabaseChallengeEntries";
import { useSupabaseChallenges } from "@/src/hooks/queries/useSupabaseChallenges";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict, isPast } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChallengeDetailsScreen() {
  // Extract the challenge ID from the route parameters
  const { id } = useLocalSearchParams<{ id: string }>();

  // Get the currently authenticated user from Clerk
  const { user } = useUser();

  // Local state for the entry submission form
  const [entryContent, setEntryContent] = useState("");
  const [entryImage, setEntryImage] = useState<string | null>(null);

  // Fetch challenges, entries, total entry count, and the current user's entry from Supabase
  const { data: challenges = [] } = useSupabaseChallenges();
  const { data: entries = [], isLoading: entriesLoading } =
    useSupabaseChallengeEntries(id);
  const { data: entriesCount = 0 } = useSupabaseChallengeEntriesCount(id);
  const { data: userEntry } = useSupabaseUserChallengeEntry(id, user?.id);

  // Mutation hooks for submitting, updating, and deleting challenge entries
  const submitMutation = useSubmitChallengeEntry();
  const updateMutation = useUpdateChallengeEntry();
  const deleteMutation = useDeleteChallengeEntry();

  // Find the current challenge from the list using the route ID
  const challenge = challenges.find((c) => c.id === id);

  // Check if the challenge end date has already passed
  const isExpired = challenge ? isPast(new Date(challenge.end_date)) : false;

  // Human-readable time remaining label for display in the challenge info card
  const timeRemaining = challenge
    ? formatDistanceToNowStrict(new Date(challenge.end_date), {
        addSuffix: false,
      })
    : "";

  // Sort entries by vote count descending when the challenge has ended for leaderboard display
  // Kept in original order while the challenge is still active
  const sortedEntries = useMemo(() => {
    if (!isExpired) return entries;
    return [...entries].sort((a, b) => (b.votes ?? 0) - (a.votes ?? 0));
  }, [entries, isExpired]);

  // The winner is the first entry after sorting — only relevant when the challenge has ended
  const winner =
    isExpired && sortedEntries.length > 0 ? sortedEntries[0] : null;

  // Use sorted entries for display on expired challenges, original order otherwise
  const displayEntries = isExpired ? sortedEntries : entries;

  // Opens the device image library for the user to select a photo for their entry
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEntryImage(result.assets[0].uri);
    }
  };

  // Handles both submitting a new entry and updating an existing one
  // Uses updateMutation if the user already has an entry, otherwise submitMutation
  const handleSubmitEntry = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to submit an entry");
      return;
    }
    if (!entryContent.trim() && !entryImage) {
      Alert.alert("Entry Required", "Please add content or an image");
      return;
    }
    try {
      if (userEntry) {
        // Update the existing entry rather than creating a duplicate
        await updateMutation.mutateAsync({
          entryId: userEntry.id,
          challengeId: id,
          userId: user.id,
          content: entryContent.trim(),
          imageUrl: entryImage || undefined,
        });
        Alert.alert("Success!", "Your entry has been updated! 🎉");
      } else {
        await submitMutation.mutateAsync({
          challengeId: id,
          userId: user.id,
          content: entryContent.trim(),
          imageUrl: entryImage || undefined,
        });
        Alert.alert("Success!", "Your entry has been submitted! 🎉");
      }
      // Clear the form after a successful submission or update
      setEntryContent("");
      setEntryImage(null);
    } catch {
      Alert.alert("Error", "Failed to submit entry");
    }
  };

  // Handles deleting a specific entry by ID — only owners can trigger this
  const handleDeleteEntry = useCallback(
    async (entryId: string) => {
      if (!user?.id) return;
      try {
        await deleteMutation.mutateAsync({
          entryId,
          challengeId: id,
          userId: user.id,
        });
      } catch {
        Alert.alert("Error", "Failed to delete entry");
      }
    },
    [user?.id, id, deleteMutation],
  );

  // Renders each challenge entry card with rank and winner status when challenge has ended
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      const isOwner = item.user_id === user?.id;

      // Rank is 1-based — only provided after the challenge ends for leaderboard ordering
      const rank = isExpired ? index + 1 : undefined;

      // Winner is the first entry in the sorted list with at least one vote
      const isWinner = isExpired && index === 0 && (item.votes ?? 0) > 0;

      return (
        <ChallengeEntryCard
          entry={item}
          challengeId={id}
          // Only pass the delete handler to the entry owner
          onDelete={isOwner ? () => handleDeleteEntry(item.id) : undefined}
          rank={rank}
          isWinner={isWinner}
          isExpired={isExpired}
        />
      );
    },
    [user?.id, id, handleDeleteEntry, isExpired],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // Show a loading spinner while the challenge data is being fetched
  if (!challenge) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading challenge...</Text>
      </View>
    );
  }

  // Winner banner shown at the top of entries when the challenge has ended and entries exist
  const WinnerBanner = winner ? (
    <View style={styles.winnerBanner}>
      <View style={styles.winnerBannerGlow} />
      <Text style={styles.winnerTrophy}>🏆</Text>
      <View style={styles.winnerBannerContent}>
        <Text style={styles.winnerBannerTitle}>Challenge Winner</Text>
        <View style={styles.winnerBannerRow}>
          <Image
            source={{
              uri: winner.user?.image || "https://via.placeholder.com/30",
            }}
            style={styles.winnerBannerAvatar}
          />
          <Text style={styles.winnerBannerName}>{winner.user?.name}</Text>
          <View style={styles.winnerVotePill}>
            <MaterialCommunityIcons name="thumb-up" size={12} color="#B8860B" />
            <Text style={styles.winnerVoteText}>{winner.votes ?? 0} votes</Text>
          </View>
        </View>
      </View>
    </View>
  ) : null;

  // Podium leaderboard showing the top 3 entries with medal positions
  const LeaderboardPodium =
    isExpired && sortedEntries.length >= 2 ? (
      <View style={styles.podiumSection}>
        <View style={styles.podiumHeader}>
          <MaterialCommunityIcons
            name="podium"
            size={18}
            color={COLORS.primary}
          />
          <Text style={styles.podiumTitle}>Leaderboard</Text>
        </View>
        <View style={styles.podiumRow}>
          {sortedEntries.slice(0, 3).map((entry, idx) => {
            // Medal emoji, bar height, and colours correspond to rank position
            const medals = ["🥇", "🥈", "🥉"];
            const heights = [72, 56, 44];
            const bgColors = ["#FEF9E7", "#F3F4F6", "#FEF3C7"];
            const borderColors = ["#F59E0B", "#9CA3AF", "#D97706"];
            return (
              <View key={entry.id} style={styles.podiumItem}>
                <Image
                  source={{
                    uri: entry.user?.image || "https://via.placeholder.com/36",
                  }}
                  style={[
                    styles.podiumAvatar,
                    // Winner gets a larger avatar with a gold border
                    idx === 0 && styles.podiumAvatarWinner,
                  ]}
                />
                <Text style={styles.podiumMedal}>{medals[idx]}</Text>
                <Text style={styles.podiumName} numberOfLines={1}>
                  {entry.user?.name?.split(" ")[0]}
                </Text>
                <Text style={styles.podiumVotes}>{entry.votes ?? 0} votes</Text>
                <View
                  style={[
                    styles.podiumBar,
                    {
                      height: heights[idx],
                      backgroundColor: bgColors[idx],
                      borderTopColor: borderColors[idx],
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>
    ) : null;

  // Header rendered above the entries list — contains challenge info, winner, podium, and submission form
  const renderHeader = () => (
    <>
      {/* Challenge info card showing title, description, time remaining, and entry count */}
      <View style={styles.challengeInfo}>
        <View
          style={[
            styles.iconContainer,
            // Grey out the trophy icon when the challenge has ended
            isExpired && styles.iconContainerExpired,
          ]}
        >
          <MaterialCommunityIcons
            name="trophy"
            size={32}
            color={isExpired ? "#9CA3AF" : "#F59E0B"}
          />
        </View>
        <Text style={styles.challengeTitle}>{challenge.title}</Text>
        {challenge.description && (
          <Text style={styles.challengeDescription}>
            {challenge.description}
          </Text>
        )}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={16}
            color={COLORS.textSecondary}
          />
          <Text style={styles.metaText}>
            {isExpired ? "Ended" : `${timeRemaining} left`}
          </Text>
          <Text style={styles.separator}>•</Text>
          <MaterialCommunityIcons
            name="account-group"
            size={16}
            color={COLORS.textSecondary}
          />
          <Text style={styles.metaText}>
            {entriesCount} {entriesCount === 1 ? "entry" : "entries"}
          </Text>
        </View>

        {/* Expired banner shown when the challenge end date has passed */}
        {isExpired && (
          <View style={styles.expiredBanner}>
            <MaterialCommunityIcons
              name="information"
              size={16}
              color="#DC2626"
            />
            <Text style={styles.expiredText}>This challenge has ended</Text>
          </View>
        )}
      </View>

      {/* Winner banner — only rendered after the challenge ends and at least one entry has votes */}
      {isExpired && WinnerBanner}

      {/* Podium leaderboard — only rendered after the challenge ends with 2 or more entries */}
      {isExpired && LeaderboardPodium}

      {/* Entry submission form — hidden once the challenge has ended */}
      {!isExpired && (
        <View style={styles.submitSection}>
          <Text style={styles.sectionTitle}>
            {userEntry ? "Update Your Entry" : "Submit Your Entry"}
          </Text>

          <TextInput
            placeholder="Share your progress..."
            placeholderTextColor="rgb(39, 44, 35)"
            value={entryContent}
            onChangeText={setEntryContent}
            multiline
            style={styles.textInput}
            maxLength={200}
          />

          {/* Image preview with a remove button shown when an image has been selected */}
          {entryImage && (
            <View style={styles.imagePreview}>
              <Image source={{ uri: entryImage }} style={styles.previewImage} />
              <Pressable
                onPress={() => setEntryImage(null)}
                style={styles.removeImageButton}
              >
                <MaterialCommunityIcons name="close" size={20} color="white" />
              </Pressable>
            </View>
          )}

          <View style={styles.submitActions}>
            {/* Image picker button */}
            <Pressable onPress={pickImage} style={styles.imageButton}>
              <MaterialCommunityIcons
                name="image-plus"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.imageButtonText}>Add Photo</Text>
            </Pressable>

            {/* Submit or update button — disabled while mutation is in progress */}
            <Pressable
              onPress={handleSubmitEntry}
              disabled={submitMutation.isPending || updateMutation.isPending}
              style={styles.submitButton}
            >
              {submitMutation.isPending || updateMutation.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="send" size={18} color="white" />
                  <Text style={styles.submitButtonText}>
                    {userEntry ? "Update Entry" : "Submit Entry"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Entries section header with label and count */}
      <View style={styles.entriesHeader}>
        <Text style={styles.entriesTitle}>
          {isExpired ? "All Entries" : "Participant Entries"}
        </Text>
        <Text style={styles.entriesCount}>{entriesCount}</Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Screen header with back button and title */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenge</Text>
        {/* Spacer view to keep the title centred */}
        <View style={{ width: 24 }} />
      </View>

      {/* KeyboardAvoidingView ensures the entry form stays visible when keyboard opens */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={displayEntries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          // Empty state shown only after loading completes with no entries
          ListEmptyComponent={
            !entriesLoading ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={48}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.emptyTitle}>No entries yet</Text>
                <Text style={styles.emptySubtitle}>
                  Be the first to submit your entry!
                </Text>
              </View>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          // Performance optimisations for challenges with many entries
          removeClippedSubviews={true}
          maxToRenderPerBatch={8}
          windowSize={8}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  header: {
    height: 56,
    backgroundColor: COLORS.headerMain,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  challengeInfo: {
    backgroundColor: "white",
    padding: 20,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconContainerExpired: {
    backgroundColor: "#F3F4F6",
  },
  challengeTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  challengeDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  separator: {
    color: COLORS.textSecondary,
    marginHorizontal: 4,
  },
  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    marginTop: 12,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  winnerBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
    marginHorizontal: 15,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    overflow: "hidden",
  },
  winnerBannerGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "#F59E0B",
  },
  winnerTrophy: {
    fontSize: 36,
  },
  winnerBannerContent: {
    flex: 1,
  },
  winnerBannerTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  winnerBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  winnerBannerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  winnerBannerName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
  },
  winnerVotePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  winnerVoteText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#B8860B",
  },
  podiumSection: {
    backgroundColor: "white",
    marginTop: 10,
    marginHorizontal: 15,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  podiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  podiumTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  podiumRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 8,
  },
  podiumItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  podiumAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginBottom: 2,
  },
  podiumAvatarWinner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    borderColor: "#F59E0B",
  },
  podiumMedal: {
    fontSize: 18,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  podiumVotes: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  podiumBar: {
    width: "100%",
    borderTopWidth: 3,
    borderRadius: 6,
  },
  submitSection: {
    backgroundColor: "white",
    padding: 15,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  imagePreview: {
    position: "relative",
    marginBottom: 12,
  },
  previewImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  submitActions: {
    flexDirection: "row",
    gap: 10,
  },
  imageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  imageButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  entriesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "white",
    marginTop: 8,
  },
  entriesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  entriesCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
});
