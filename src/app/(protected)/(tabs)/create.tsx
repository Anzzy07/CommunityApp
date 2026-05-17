import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import {
  useCreatePoll,
  useCreatePost,
} from "@/src/hooks/mutations/usePostMutations";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign, Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
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

// This screen handles both post and poll creation.
// The active mode is toggled by the user and controls which form is rendered.
export default function CreateScreen() {
  const { user } = useUser();

  // 5 MB upper limit applied consistently for all image uploads on this screen
  const MAX_SIZE = 5 * 1024 * 1024;

  // Determines which form (post or poll) is currently visible
  const [mode, setMode] = useState<CreateMode>("post");

  // Post-specific form fields
  const [title, setTitle] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");
  const [postImage, setPostImage] = useState<string | null>(null);

  // Persisted in a Jotai atom so the selected community survives navigation
  // to the group selector screen and back
  const [group, setGroup] = useAtom(selectedGroupAtom);

  // Poll-specific form fields
  const [pollQuestion, setPollQuestion] = useState<string>("");
  const [pollOptions, setPollOptions] = useState<PollOption[]>([
    { id: "1", text: "" },
    { id: "2", text: "" },
  ]);
  const [pollDuration, setPollDuration] = useState<string>("24h");

  // Track which input is focused so a coloured border can be shown on the active field
  const [titleFocused, setTitleFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);
  const [pollQuestionFocused, setPollQuestionFocused] = useState(false);

  const createPostMutation = useCreatePost();
  const createPollMutation = useCreatePoll();

  // Duration options presented as selectable chips in the poll form
  const pollDurations = [
    { label: "1 hour", value: "1h", hours: 1 },
    { label: "6 hours", value: "6h", hours: 6 },
    { label: "24 hours", value: "24h", hours: 24 },
    { label: "3 days", value: "3d", hours: 72 },
    { label: "7 days", value: "7d", hours: 168 },
  ];

  // Reset all form state and dismiss the screen.
  // Called after a successful submission or when the user closes the form.
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

  // Open the device photo library so the user can attach an image to a post.
  // The file size is validated on both Android (via asset metadata) and iOS
  // (via FileSystem) before the URI is accepted.
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
      aspect: [1, 1],
      quality: 1.0,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      // Android exposes fileSize directly on the asset object
      if (asset.fileSize && asset.fileSize > MAX_SIZE) {
        Alert.alert("Image too large", "Please select an image under 2MB.");
        return;
      }

      // iOS does not always populate fileSize, so fall back to FileSystem
      try {
        const fileInfo = await FileSystem.getInfoAsync(asset.uri);

        if (!fileInfo.exists || typeof fileInfo.size !== "number") {
          Alert.alert("Error", "Could not read image size.");
          return;
        }

        if (fileInfo.size > MAX_SIZE) {
          Alert.alert(
            "Image too large",
            "Please select an image with low size.",
          );
          return;
        }
      } catch (error) {
        Alert.alert("Error", "Could not access file information.");
        return;
      }

      setPostImage(asset.uri);
    }
  };

  // Open the photo library to attach an optional image to a specific poll option
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
      const asset = result.assets[0];

      if (asset.fileSize && asset.fileSize > MAX_SIZE) {
        Alert.alert(
          "Image too large",
          "Please select an image smaller than 5MB.",
        );
        return;
      }

      // Update only the targeted option, leaving all other options unchanged
      setPollOptions((prev) =>
        prev.map((opt) =>
          opt.id === optionId ? { ...opt, image: asset.uri } : opt,
        ),
      );
    }
  };

  // Remove the image from a poll option without deleting the option itself
  const removePollOptionImage = (optionId: string) => {
    setPollOptions((prev) =>
      prev.map((opt) =>
        opt.id === optionId ? { ...opt, image: undefined } : opt,
      ),
    );
  };

  // Append a new blank option — capped at 4 to keep the poll manageable
  const addPollOption = () => {
    if (pollOptions.length < 4) {
      setPollOptions([...pollOptions, { id: Date.now().toString(), text: "" }]);
    }
  };

  // Delete a poll option by id — at least 2 options must always remain
  const removePollOption = (id: string) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((opt) => opt.id !== id));
    }
  };

  // Update the text of a single poll option while keeping all others intact
  const updatePollOption = (id: string, text: string) => {
    setPollOptions(
      pollOptions.map((opt) => (opt.id === id ? { ...opt, text } : opt)),
    );
  };

  // Validate the form, then submit either a post or a poll to Supabase.
  // Image size is re-checked here as a safety net in case the file changed
  // between selection and submission.
  const handlePost = async () => {
    if (!user?.id || !group) {
      Alert.alert("Error", "Please select a community and sign in");
      return;
    }

    try {
      // Re-validate post image size immediately before the upload request
      if (mode === "post" && postImage) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(postImage);

          if (!fileInfo.exists || typeof fileInfo.size !== "number") {
            Alert.alert("Error", "Could not read image size.");
            return;
          }

          if (fileInfo.size > MAX_SIZE) {
            Alert.alert("Image too large", "Please select an image under 2MB.");
            return;
          }
        } catch (error) {
          Alert.alert("Error", "Could not access image information.");
          return;
        }
      }

      if (mode === "post") {
        await createPostMutation.mutateAsync({
          groupId: group.id,
          userId: user.id,
          title: title.trim(),
          description: bodyText.trim() || undefined,
          imageUri: postImage || undefined,
        });

        Alert.alert("Success!", "Your post has been created! 🎉");
      } else {
        // Look up the chosen duration chip to get the numeric hours value
        const durationHours =
          pollDurations.find((d) => d.value === pollDuration)?.hours || 24;

        // Ignore any options the user left blank before sending to the server
        const validOptions = pollOptions
          .filter((opt) => opt.text.trim().length > 0)
          .map((opt) => ({
            text: opt.text.trim(),
            imageUri: opt.image,
          }));

        await createPollMutation.mutateAsync({
          groupId: group.id,
          userId: user.id,
          question: pollQuestion.trim(),
          options: validOptions,
          durationHours,
        });

        Alert.alert("Success!", "Your poll has been created! 📊");
      }

      goBack();
    } catch {
      Alert.alert("Error", "Failed to create post. Please try again.");
    }
  };

  // The Post button is only enabled when the minimum required fields are filled
  const canPost = () => {
    if (mode === "post") {
      // A title and a selected community are the minimum requirements for a post
      return title.trim().length > 0 && group !== null;
    } else {
      // A poll additionally requires a question and at least two non-empty options
      return (
        pollQuestion.trim().length > 0 &&
        pollOptions.filter((opt) => opt.text.trim().length > 0).length >= 2 &&
        group !== null
      );
    }
  };

  // While either mutation is in-flight, all interactive elements are disabled
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
      {/* Header: close button dismisses the screen; Post button submits the form */}
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={10} disabled={isPosting}>
          <AntDesign name="close" size={28} color={COLORS.textPrimary} />
        </Pressable>

        {/* Disabled while the form is invalid or a submission is in progress */}
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

      {/* Toggle between Post and Poll creation modes */}
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

      {/* Pushes content above the keyboard on iOS so inputs remain visible */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Community selector — the chosen group is stored in a Jotai atom
              so it persists when the user navigates to the selector and back */}
          <Link href={"/groupSelector"} asChild>
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

          {/* POST FORM  */}
          {mode === "post" && (
            <>
              {/* Title field */}
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

              {/* Body text field — optional additional context for the post */}
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

              {/* Show a preview of the selected image with a remove button,
                  or show the "Add Image" trigger if no image has been chosen */}
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

          {/* POLL FORM  */}
          {mode === "poll" && (
            <>
              {/* Poll question field */}
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

              {/* Dynamic list of poll options — each supports text and an optional image */}
              <View style={styles.pollOptionsContainer}>
                {pollOptions.map((option, index) => (
                  <View key={option.id} style={styles.pollOptionWrapper}>
                    <View style={styles.pollOptionHeader}>
                      <Text style={styles.pollOptionLabel}>
                        Option {index + 1}
                      </Text>
                      {/* Delete button is hidden when only the minimum 2 options remain */}
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

                    {/* Image attachment for this specific option — entirely optional */}
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

                {/* "Add option" button is hidden once the 4-option maximum is reached */}
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

              {/* Horizontally scrollable duration chips */}
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
