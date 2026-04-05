import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import {
  useCreatePoll,
  useCreatePost,
} from "@/src/hooks/mutations/usePostMutations";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Link, router } from "expo-router";
import { useAtom } from "jotai";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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

type CreateMode = "post" | "poll";

interface PollOption {
  id: string;
  text: string;
  image?: string;
}

// Screen for creating a new post or poll — switches between modes via a toggle
export default function CreateScreen() {
  const { user } = useUser();

  // Controls whether the user is creating a post or a poll
  const [mode, setMode] = useState<CreateMode>("post");

  // Post form state
  const [title, setTitle] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");
  const [postImage, setPostImage] = useState<string | null>(null);

  // Jotai atom — stores the selected community so it persists across navigation
  const [group, setGroup] = useAtom(selectedGroupAtom);

  // Poll form state
  const [pollQuestion, setPollQuestion] = useState<string>("");
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: "1", text: "" },
    { id: "2", text: "" },
  ]);
  const [pollDuration, setPollDuration] = useState<string>("24h");

  // Focus states — used to highlight the active input field with a border
  const [titleFocused, setTitleFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [pollQuestionFocused, setPollQuestionFocused] = useState(false);

  // Mutation hooks for creating posts and polls in Supabase
  const createPostMutation = useCreatePost();
  const createPollMutation = useCreatePoll();

  // Available durations for polls — shown as selectable chips
  const pollDurations = [
    { label: "1 hour", value: "1h", hours: 1 },
    { label: "6 hours", value: "6h", hours: 6 },
    { label: "24 hours", value: "24h", hours: 24 },
    { label: "3 days", value: "3d", hours: 72 },
    { label: "7 days", value: "7d", hours: 168 },
  ];

  // Resets all form fields and navigates back to the previous screen
  const goBack = () => {
    setTitle("");
    setBodyText("");
    setPostImage(null);
    setPollQuestion("");
    setPollOptions([
      { id: "1", text: "" },
      { id: "2", text: "" },
    ]);
    setGroup(null);
    router.back();
  };

  // Opens the device image picker for selecting a post image
  const pickPostImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant photo library access to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPostImage(result.assets[0].uri);
    }
  };

  // Opens the image picker for a specific poll option
  const pickPollOptionImage = async (optionId: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant photo library access to upload images.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      // Update only the matching option, leave others unchanged
      setPollOptions((prev) =>
        prev.map((opt) =>
          opt.id === optionId ? { ...opt, image: result.assets[0].uri } : opt,
        ),
      );
    }
  };

  // Removes the image from a specific poll option
  const removePollOptionImage = (optionId: string) => {
    setPollOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId ? { ...opt, image: undefined } : opt,
      ),
    );
  };

  // Adds a new empty poll option — max 4 options allowed
  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, { id: Date.now().toString(), text: "" }]);
    }
  };

  // Removes a poll option by id — minimum 2 options must remain
  const removePollOption = (id: string) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((opt) => opt.id !== id));
    }
  };

  // Updates the text of a specific poll option
  const updatePollOption = (id: string, text: string) => {
    setPollOptions(
      pollOptions.map((opt) => (opt.id === id ? { ...opt, text } : opt)),
    );
  };

  // Validates form then submits either a post or poll to Supabase
  const handlePost = async () => {
    if (!user?.id || !group) {
      Alert.alert("Error", "Please select a community and sign in");
      return;
    }

    try {
      if (mode === "post") {
        // Create a regular post with title, optional body and optional image
        await createPostMutation.mutateAsync({
          groupId: group.id,
          userId: user.id,
          title: title.trim(),
          description: bodyText.trim() || undefined,
          imageUri: postImage || undefined,
        });

        Alert.alert("Success!", "Your post has been created! 🎉");
      } else {
        // Find the number of hours matching the selected duration chip
        const durationHours =
          pollDurations.find((d) => d.value === pollDuration)?.hours || 24;

        // Only include options that have text — filter out empty ones
        const validOptions = pollOptions
          .filter((opt) => opt.text.trim().length > 0)
          .map((opt) => ({
            text: opt.text.trim(),
            imageUri: opt.image,
          }));

        // Create a poll post with question, options and duration
        await createPollMutation.mutateAsync({
          groupId: group.id,
          userId: user.id,
          question: pollQuestion.trim(),
          options: validOptions,
          durationHours,
        });

        Alert.alert("Success!", "Your poll has been created! 📊");
      }

      // Clear form and go back after successful creation
      goBack();
    } catch {
      Alert.alert("Error", "Failed to create post. Please try again.");
    }
  };

  // Returns true only when the form has enough data to submit
  const canPost = () => {
    if (mode === "post") {
      // Post needs at least a title and a community
      return title.trim().length > 0 && group !== null;
    } else {
      // Poll needs a question, at least 2 filled options, and a community
      return (
        pollQuestion.trim().length > 0 &&
        pollOptions.filter((opt) => opt.text.trim().length > 0).length >= 2 &&
        group !== null
      );
    }
  };

  // True when either mutation is in progress — disables all inputs during upload
  const isPosting =
    createPostMutation.isPending || createPollMutation.isPending;

  return (
    <SafeAreaView
      style={{
        backgroundColor: COLORS.background,
        flex: 1,
        paddingHorizontal: 10,
      }}
    >
      {/* Header: close button on left, Post button on right */}
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={10} disabled={isPosting}>
          <AntDesign name="close" size={28} color={COLORS.textPrimary} />
        </Pressable>

        {/* Post button — disabled until form is valid or while submitting */}
        <Pressable
          onPress={handlePost}
          hitSlop={10}
          disabled={!canPost() || isPosting}
          style={[
            styles.postButton,
            (!canPost() || isPosting) && styles.postButtonDisabled,
          ]}
        >
          {isPosting ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.postText}>Post</Text>
          )}
        </Pressable>
      </View>

      {/* Mode toggle: switches between Post and Poll creation forms */}
      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => setMode("post")}
          disabled={isPosting}
          style={[
            styles.modeButton,
            mode === "post" && styles.modeButtonActive,
          ]}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={mode === "post" ? COLORS.button : COLORS.textSecondary}
          />
          <Text
            style={[styles.modeText, mode === "post" && styles.modeTextActive]}
          >
            Post
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode("poll")}
          disabled={isPosting}
          style={[
            styles.modeButton,
            mode === "poll" && styles.modeButtonActive,
          ]}
        >
          <Ionicons
            name="bar-chart-outline"
            size={18}
            color={mode === "poll" ? COLORS.button : COLORS.textSecondary}
          />
          <Text
            style={[styles.modeText, mode === "poll" && styles.modeTextActive]}
          >
            Poll
          </Text>
        </Pressable>
      </View>

      {/* KeyboardAvoidingView pushes content up when keyboard appears on iOS */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Community selector — navigates to groupSelector screen and stores selection in Jotai atom */}
          <Link href={"groupSelector"} asChild>
            <Pressable style={styles.communityContainer} disabled={isPosting}>
              {group ? (
                <>
                  <Image
                    source={{
                      uri: group.image || "https://via.placeholder.com/20",
                    }}
                    style={styles.communityImage}
                  />
                  <Text style={styles.communityText}>{group.name}</Text>
                  <AntDesign
                    name="down"
                    size={12}
                    color={COLORS.textPrimary}
                    style={{ marginLeft: 4 }}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.kStyles}>k/</Text>
                  <Text style={styles.communityText}>Select a community</Text>
                  <AntDesign
                    name="down"
                    size={12}
                    color={COLORS.textPrimary}
                    style={{ marginLeft: 4 }}
                  />
                </>
              )}
            </Pressable>
          </Link>

          {/* POST MODE — title, body text and image upload */}
          {mode === "post" && (
            <>
              {/* Title input — required field */}
              <View
                style={[
                  styles.inputContainer,
                  titleFocused && styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  placeholder="An interesting title"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.titleInput}
                  value={title}
                  onChangeText={setTitle}
                  onFocus={() => setTitleFocused(true)}
                  onBlur={() => setTitleFocused(false)}
                  multiline
                  scrollEnabled={false}
                  selectionColor={COLORS.button}
                  maxLength={300}
                  editable={!isPosting}
                />
              </View>

              {/* Body text input — optional */}
              <View
                style={[
                  styles.bodyContainer,
                  bodyFocused && styles.bodyContainerFocused,
                ]}
              >
                <TextInput
                  placeholder="Text (optional)"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.bodyInput}
                  value={bodyText}
                  onChangeText={setBodyText}
                  onFocus={() => setBodyFocused(true)}
                  onBlur={() => setBodyFocused(false)}
                  multiline
                  scrollEnabled={false}
                  selectionColor={COLORS.button}
                  editable={!isPosting}
                />
              </View>

              {/* Image preview with remove button, or add image button if no image */}
              {postImage ? (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: postImage }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <Pressable
                    onPress={() => setPostImage(null)}
                    style={styles.removeImageButton}
                    disabled={isPosting}
                  >
                    <Ionicons name="close-circle" size={28} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={pickPostImage}
                  style={styles.addImageButton}
                  disabled={isPosting}
                >
                  <Ionicons
                    name="image-outline"
                    size={24}
                    color={COLORS.button}
                  />
                  <Text style={styles.addImageText}>Add Image</Text>
                </Pressable>
              )}
            </>
          )}

          {/* POLL MODE — question, options with optional images, duration selector */}
          {mode === "poll" && (
            <>
              {/* Poll question input — acts as the post title */}
              <View
                style={[
                  styles.inputContainer,
                  pollQuestionFocused && styles.inputContainerFocused,
                ]}
              >
                <TextInput
                  placeholder="Ask a question..."
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.titleInput}
                  value={pollQuestion}
                  onChangeText={setPollQuestion}
                  onFocus={() => setPollQuestionFocused(true)}
                  onBlur={() => setPollQuestionFocused(false)}
                  multiline
                  scrollEnabled={false}
                  selectionColor={COLORS.button}
                  maxLength={300}
                  editable={!isPosting}
                />
              </View>

              {/* List of poll options — each has a text input and optional image */}
              <View style={styles.pollOptionsContainer}>
                {pollOptions.map((option, index) => (
                  <View key={option.id} style={styles.pollOptionWrapper}>
                    <View style={styles.pollOptionHeader}>
                      <Text style={styles.pollOptionLabel}>
                        Option {index + 1}
                      </Text>
                      {/* Delete button only shown when there are more than 2 options */}
                      {pollOptions.length > 2 && (
                        <Pressable
                          onPress={() => removePollOption(option.id)}
                          hitSlop={10}
                          disabled={isPosting}
                        >
                          <MaterialIcons
                            name="delete-outline"
                            size={20}
                            color={COLORS.error}
                          />
                        </Pressable>
                      )}
                    </View>

                    <TextInput
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor={COLORS.textSecondary}
                      style={styles.pollOptionInput}
                      value={option.text}
                      onChangeText={(text) => updatePollOption(option.id, text)}
                      selectionColor={COLORS.button}
                      maxLength={100}
                      editable={!isPosting}
                    />

                    {/* Image for this poll option — optional */}
                    {option.image ? (
                      <View style={styles.pollOptionImageContainer}>
                        <Image
                          source={{ uri: option.image }}
                          style={styles.pollOptionImage}
                          resizeMode="cover"
                        />
                        <Pressable
                          onPress={() => removePollOptionImage(option.id)}
                          style={styles.removePollImageButton}
                          disabled={isPosting}
                        >
                          <Ionicons
                            name="close-circle"
                            size={24}
                            color="#fff"
                          />
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => pickPollOptionImage(option.id)}
                        style={styles.addPollImageButton}
                        disabled={isPosting}
                      >
                        <Ionicons
                          name="image-outline"
                          size={18}
                          color={COLORS.textSecondary}
                        />
                        <Text style={styles.addPollImageText}>
                          Add image (optional)
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ))}

                {/* Add option button — hidden when 4 options already exist */}
                {pollOptions.length < 4 && (
                  <Pressable
                    onPress={addPollOption}
                    style={styles.addOptionButton}
                    disabled={isPosting}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={COLORS.button}
                    />
                    <Text style={styles.addOptionText}>Add option</Text>
                  </Pressable>
                )}
              </View>

              {/* Duration selector — horizontally scrollable chips */}
              <View style={styles.durationContainer}>
                <Text style={styles.durationLabel}>Poll duration</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.durationScroll}
                >
                  {pollDurations.map((duration) => (
                    <Pressable
                      key={duration.value}
                      onPress={() => setPollDuration(duration.value)}
                      disabled={isPosting}
                      style={[
                        styles.durationButton,
                        pollDuration === duration.value &&
                          styles.durationButtonActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.durationButtonText,
                          pollDuration === duration.value &&
                            styles.durationButtonTextActive,
                        ]}
                      >
                        {duration.label}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          {/* Bottom padding so content isn't hidden behind the keyboard */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    marginBottom: 8,
  },
  postButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonDisabled: {
    backgroundColor: COLORS.disableBtn,
    opacity: 0.5,
  },
  postText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: COLORS.background,
  },
  modeText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  modeTextActive: {
    color: COLORS.button,
  },
  communityContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    alignSelf: "flex-start",
    marginVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  communityImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  communityText: {
    fontWeight: "600",
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  kStyles: {
    backgroundColor: COLORS.button,
    color: "white",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    fontWeight: "700",
    fontSize: 12,
  },
  inputContainer: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: 12,
  },
  inputContainerFocused: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.button,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  bodyContainer: {
    marginTop: 24,
  },
  bodyContainerFocused: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.button,
  },
  bodyInput: {
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 20,
    paddingHorizontal: 4,
    minHeight: 200,
    textAlignVertical: "top",
  },
  addImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    paddingVertical: 32,
    borderRadius: 12,
    marginTop: 20,
  },
  addImageText: {
    color: COLORS.button,
    fontWeight: "600",
    fontSize: 15,
  },
  imagePreviewContainer: {
    marginTop: 20,
    borderRadius: 12,
    overflow: "hidden",
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 220,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
  },
  pollOptionsContainer: {
    marginTop: 24,
    gap: 16,
  },
  pollOptionWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pollOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  pollOptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  pollOptionInput: {
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pollOptionImageContainer: {
    marginTop: 12,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  pollOptionImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  removePollImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
  },
  addPollImageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  addPollImageText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "500",
  },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: "dashed",
  },
  addOptionText: {
    color: COLORS.button,
    fontWeight: "600",
    fontSize: 15,
  },
  durationContainer: {
    marginTop: 24,
  },
  durationLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  durationScroll: {
    gap: 8,
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  durationButtonActive: {
    backgroundColor: COLORS.button,
    borderColor: COLORS.button,
  },
  durationButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  durationButtonTextActive: {
    color: "#fff",
  },
});
