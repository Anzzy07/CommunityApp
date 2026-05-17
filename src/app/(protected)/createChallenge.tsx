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

// Screen accessible only to community leaders for creating a new challenge
export default function CreateChallengeScreen() {
  // groupId is passed as a route parameter when navigating from the community screen
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  // Get the currently authenticated user from Clerk
  const { user } = useUser();

  // Mutation hook for submitting the new challenge to the database
  const createChallengeMutation = useCreateChallenge();

  // Form state for the challenge title, description, and selected duration
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Default duration set to 7 days — the most common choice
  const [duration, setDuration] = useState("7d");

  // Available duration options displayed as selectable buttons
  const durations = [
    { label: "3 days", value: "3d", days: 3 },
    { label: "7 days", value: "7d", days: 7 },
    { label: "14 days", value: "14d", days: 14 },
    { label: "30 days", value: "30d", days: 30 },
  ];

  // Validates the form and creates the challenge in the database
  const handleCreate = async () => {
    if (!title.trim() || !groupId) {
      Alert.alert("Title Required", "Please enter a challenge title");
      return;
    }

    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to create challenges");
      return;
    }

    // Look up the number of days for the selected duration option
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

      // Return to the community screen after the challenge has been created
      router.back();
    } catch {
      Alert.alert("Error", "Failed to create challenge. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with close button, screen title, and create action */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="close" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Create Challenge</Text>

        {/* Create button — reduced opacity and disabled until title is entered */}
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

      {/* KeyboardAvoidingView shifts the form up on iOS when the keyboard opens */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Trophy icon displayed at the top of the form */}
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

          {/* Duration selector — tapping a button updates the selected duration */}
          <View style={styles.durationSection}>
            <Text style={styles.sectionTitle}>Duration</Text>
            <View style={styles.durationGrid}>
              {durations.map((item) => (
                <Pressable
                  key={item.value}
                  onPress={() => setDuration(item.value)}
                  style={[
                    styles.durationButton,
                    // Highlight the button when it matches the selected duration
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

          {/* Info box explaining what the challenge allows members to do */}
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
    fontSize: 22,
    fontWeight: "600",
  },
  createText: {
    color: "white",
    fontWeight: "600",
    fontSize: 20,
  },
  scrollContent: { padding: 20 },
  iconSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 4,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  iconLabel: {
    fontSize: 20,
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
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    fontSize: 17,
    color: COLORS.textPrimary,
    padding: 0,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 8,
  },
  durationSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
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
    fontSize: 18,
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
    fontSize: 15,
    color: "white",
    lineHeight: 20,
  },
});
