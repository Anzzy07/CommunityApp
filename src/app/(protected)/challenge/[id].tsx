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
import React, { useCallback, useState } from "react";
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
  // id is the challenge ID from the route params
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();

  // Local form state for the entry submission section
  const [entryContent, setEntryContent] = useState("");
  const [entryImage, setEntryImage] = useState<string | null>(null);

  // Fetch all challenges to find the current one by id
  const { data: challenges = [] } = useSupabaseChallenges();

  // Fetch entries, entry count, and user's own entry for this challenge
  const { data: entries = [], isLoading: entriesLoading } =
    useSupabaseChallengeEntries(id);
  const { data: entriesCount = 0 } = useSupabaseChallengeEntriesCount(id);
  const { data: userEntry } = useSupabaseUserChallengeEntry(id, user?.id);

  // Mutation hooks for submitting, updating and deleting entries
  const submitMutation = useSubmitChallengeEntry();
  const updateMutation = useUpdateChallengeEntry();
  const deleteMutation = useDeleteChallengeEntry();

  // Find the challenge object matching the current route id
  const challenge = challenges.find((c) => c.id === id);

  // Check if the challenge end date has passed
  const isExpired = challenge ? isPast(new Date(challenge.end_date)) : false;

  // Human-readable time remaining until the challenge ends
  const timeRemaining = challenge
    ? formatDistanceToNowStrict(new Date(challenge.end_date), {
        addSuffix: false,
      })
    : "";

  // Opens the device image picker for selecting an entry photo
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

  // Submits a new entry or updates existing one depending on userEntry state
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
        // User already has an entry — update it instead of creating a new one
        await updateMutation.mutateAsync({
          entryId: userEntry.id,
          challengeId: id,
          userId: user.id,
          content: entryContent.trim(),
          imageUrl: entryImage || undefined,
        });
        Alert.alert("Success!", "Your entry has been updated! 🎉");
      } else {
        // No existing entry — submit a brand new one
        await submitMutation.mutateAsync({
          challengeId: id,
          userId: user.id,
          content: entryContent.trim(),
          imageUrl: entryImage || undefined,
        });
        Alert.alert("Success!", "Your entry has been submitted! 🎉");
      }

      // Reset the form after successful submission
      setEntryContent("");
      setEntryImage(null);
    } catch {
      Alert.alert("Error", "Failed to submit entry");
    }
  };

  // Deletes an entry from the database — optimistic removal happens in the mutation
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

  // Stable renderItem — useCallback prevents FlatList re-rendering all cards
  // when unrelated state (like entryContent text) changes
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const isOwner = item.user_id === user?.id;
      return (
        // Pass challengeId so the vote mutation can update the correct cache key
        <ChallengeEntryCard
          entry={item}
          challengeId={id}
          onDelete={isOwner ? () => handleDeleteEntry(item.id) : undefined}
        />
      );
    },
    [user?.id, id, handleDeleteEntry],
  );

  const keyExtractor = useCallback((item: any) => item.id, []);

  // Loading state while challenge data is being fetched
  if (!challenge) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading challenge...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
        </Pressable>
        <Text style={styles.headerTitle}>Challenge</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* KeyboardAvoidingView so the entry form isn't hidden by the keyboard */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <FlatList
          data={entries}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={
            <>
              {/* Challenge info card: trophy icon, title, description, time and count */}
              <View style={styles.challengeInfo}>
                <View style={styles.iconContainer}>
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

                {/* Expired banner shown when challenge end date has passed */}
                {isExpired && (
                  <View style={styles.expiredBanner}>
                    <MaterialCommunityIcons
                      name="information"
                      size={16}
                      color="#DC2626"
                    />
                    <Text style={styles.expiredText}>
                      This challenge has ended
                    </Text>
                  </View>
                )}
              </View>

              {/* Entry submission form — hidden when challenge is expired */}
              {!isExpired && (
                <View style={styles.submitSection}>
                  <Text style={styles.sectionTitle}>
                    {userEntry ? "Update Your Entry" : "Submit Your Entry"}
                  </Text>

                  {/* Multi-line text input for entry description */}
                  <TextInput
                    placeholder="Share your progress..."
                    placeholderTextColor="#9CA3AF"
                    value={entryContent}
                    onChangeText={setEntryContent}
                    multiline
                    style={styles.textInput}
                    maxLength={200}
                  />

                  {/* Image preview with remove button */}
                  {entryImage && (
                    <View style={styles.imagePreview}>
                      <Image
                        source={{ uri: entryImage }}
                        style={styles.previewImage}
                      />
                      <Pressable
                        onPress={() => setEntryImage(null)}
                        style={styles.removeImageButton}
                      >
                        <MaterialCommunityIcons
                          name="close"
                          size={20}
                          color="white"
                        />
                      </Pressable>
                    </View>
                  )}

                  <View style={styles.submitActions}>
                    {/* Photo picker button */}
                    <Pressable onPress={pickImage} style={styles.imageButton}>
                      <MaterialCommunityIcons
                        name="image-plus"
                        size={20}
                        color={COLORS.primary}
                      />
                      <Text style={styles.imageButtonText}>Add Photo</Text>
                    </Pressable>

                    {/* Submit/Update button with loading spinner */}
                    <Pressable
                      onPress={handleSubmitEntry}
                      disabled={
                        submitMutation.isPending || updateMutation.isPending
                      }
                      style={styles.submitButton}
                    >
                      {submitMutation.isPending || updateMutation.isPending ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <>
                          <MaterialCommunityIcons
                            name="send"
                            size={18}
                            color="white"
                          />
                          <Text style={styles.submitButtonText}>
                            {userEntry ? "Update Entry" : "Submit Entry"}
                          </Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Entries list header showing participant count */}
              <View style={styles.entriesHeader}>
                <Text style={styles.entriesTitle}>Participant Entries</Text>
                <Text style={styles.entriesCount}>{entriesCount}</Text>
              </View>
            </>
          }
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
