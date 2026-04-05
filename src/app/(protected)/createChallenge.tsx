import { COLORS } from "@/src/colors";
import { useCreateChallenge } from "@/src/hooks/mutations/useChallengeMutations";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Screen for community leaders to create a new challenge
export default function CreateChallengeScreen() {
  // groupId comes from the route params — set when navigating from community screen
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useUser();
  const createChallengeMutation = useCreateChallenge();

  // Form state for the challenge fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("7d"); // default to 7 days

  // Available duration options shown as selectable buttons
  const durations = [
    { label: "3 days", value: "3d", days: 3 },
    { label: "7 days", value: "7d", days: 7 },
    { label: "14 days", value: "14d", days: 14 },
    { label: "30 days", value: "30d", days: 30 },
  ];

  // Validates form and submits the challenge to the database
  const handleCreate = async () => {
    if (!title.trim() || !groupId) {
      Alert.alert("Title Required", "Please enter a challenge title");
      return;
    }

    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to create challenges");
      return;
    }

    // Find the number of days matching the selected duration button
    const selectedDuration = durations.find((d) => d.value === duration);
    const daysToAdd = selectedDuration?.days || 7;

    try {
      await createChallengeMutation.mutateAsync({
        groupId,
        title: title.trim(),
        description: description.trim() || undefined,
        duration: daysToAdd,
        userId: user.id,
      });

      // Go back to the community screen after successful creation
      router.back();
    } catch {
      Alert.alert("Error", "Failed to create challenge. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with close button, title, and create action */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="close" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Create Challenge</Text>

        {/* Create button — disabled until title is entered */}
        <Pressable
          onPress={handleCreate}
          disabled={!title.trim() || createChallengeMutation.isPending}
          hitSlop={10}
        >
          {createChallengeMutation.isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text
              style={[styles.createText, !title.trim() && { opacity: 0.5 }]}
            >
              Create
            </Text>
          )}
        </Pressable>
      </View>

      {/* KeyboardAvoidingView pushes content up when keyboard opens on iOS */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Trophy icon shown at the top of the form */}
          <View style={styles.iconSection}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="trophy-outline"
                size={48}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.iconLabel}>Challenge</Text>
          </View>

          {/* Challenge title input with character counter */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Challenge Title</Text>
            <TextInput
              placeholder="e.g., 30 Day Fitness Challenge"
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              maxLength={60}
            />
            <Text style={styles.charCount}>{title.length}/60</Text>
          </View>

          {/* Optional description input with character counter */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              placeholder="What's the goal of this challenge?"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, styles.textArea]}
              maxLength={200}
            />
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>

          {/* Duration selector — tap a button to select how long the challenge runs */}
          <View style={styles.durationSection}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationGrid}>
              {durations.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setDuration(item.value)}
                  style={[
                    styles.durationButton,
                    duration === item.value && styles.durationButtonActive,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="calendar-clock"
                    size={20}
                    color={
                      duration === item.value ? "white" : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.durationText,
                      duration === item.value && styles.durationTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Info box explaining what the challenge does */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.infoText}>
              Members can track their progress and compete with each other
              during this challenge.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.headerMain,
  },
  header: {
    height: 56,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "600",
  },
  createText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
  scrollContent: {
    padding: 20,
  },
  iconSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 10,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  inputWrapper: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: COLORS.textPrimary,
    padding: 0,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 8,
  },
  durationSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginBottom: 12,
  },
  durationGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  durationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    minWidth: "47%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  durationButtonActive: {
    backgroundColor: COLORS.primary,
  },
  durationText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  durationTextActive: {
    color: "white",
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "white",
    lineHeight: 20,
  },
});
