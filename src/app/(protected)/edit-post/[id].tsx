import { COLORS } from "@/src/colors";
import SupabaseImage from "@/src/components/SupabaseImage";
import { useEditPost } from "@/src/hooks/mutations/usePostMutations";
import { useSupabasePostDetails } from "@/src/hooks/queries/useSupabasePostDetails";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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

export default function EditPostScreen() {
  // Extract the post ID from the route parameters
  const { id } = useLocalSearchParams();
  const router = useRouter();

  // Get the currently authenticated user from Clerk
  const { user } = useUser();

  // Fetch the current post data to pre-fill the form fields
  const { data, isLoading } = useSupabasePostDetails(id as string);

  // Mutation hook for submitting the edited post to the database
  const editPostMutation = useEditPost();

  // Only title and description are editable — image and community are read only
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Track focus state for each input to apply focused border styles
  const [titleFocused, setTitleFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);

  // Pre-fill the form fields once the post data has loaded from the database
  React.useEffect(() => {
    if (data?.post) {
      setTitle(data.post.title);
      setDescription(data.post.description || "");
    }
  }, [data]);

  // Validates the form and submits the updated post to the database
  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "You must be logged in");
      return;
    }

    try {
      await editPostMutation.mutateAsync({
        postId: id as string,
        userId: user.id,
        title: title.trim(),
        description: description.trim() || undefined,
        // Image editing is not supported in this screen so imageUri is always undefined
        imageUri: undefined,
        deleteImage: false,
      });

      Alert.alert("Success!", "Your post has been updated! 🎉");
      // Return to the previous screen after a successful save
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update post");
    }
  };

  // Alias for the mutation pending state used to disable inputs and buttons during submission
  const isSaving = editPostMutation.isPending;

  // Show a loading spinner while the post data is being fetched
  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  // Show an error screen if the post was not found or the user does not own it
  if (!data?.post || data.post.user.id !== user?.id) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>Post not found or unauthorized</Text>
        <Pressable onPress={() => router.back()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const { post } = data;

  return (
    <SafeAreaView
      style={{
        backgroundColor: COLORS.background,
        flex: 1,
        paddingHorizontal: 10,
      }}
    >
      {/* Header row with a close button on the left and a Save button on the right */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          // Disable the close button while a save is in progress
          disabled={isSaving}
        >
          <AntDesign name="close" size={28} color={COLORS.textPrimary} />
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          hitSlop={10}
          // Disable the Save button when the title is empty or a save is in progress
          disabled={!title.trim() || isSaving}
          style={[
            styles.saveButton,
            (!title.trim() || isSaving) && styles.saveButtonDisabled,
          ]}
        >
          {/* Show a spinner inside the button while the post is being saved */}
          {isSaving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      {/* KeyboardAvoidingView ensures the form fields remain visible when the keyboard opens */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Community display  */}
          <View style={styles.communityContainer}>
            <Image
              source={{
                uri: post.group.image || "https://via.placeholder.com/20",
              }}
              style={styles.communityImage}
            />
            <Text style={styles.communityText}>{post.group.name}</Text>
          </View>

          {/* Title input field with a focused border state */}
          <View
            style={[
              styles.inputContainer,
              titleFocused && styles.inputContainerFocused,
            ]}
          >
            <TextInput
              placeholder="Title"
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
              // Disable input while the save mutation is pending
              editable={!isSaving}
            />
          </View>

          {/* Description input field */}
          <View
            style={[
              styles.bodyContainer,
              bodyFocused && styles.bodyContainerFocused,
            ]}
          >
            <TextInput
              placeholder="Description (optional)"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.bodyInput}
              value={description}
              onChangeText={setDescription}
              onFocus={() => setBodyFocused(true)}
              onBlur={() => setBodyFocused(false)}
              multiline
              scrollEnabled={false}
              selectionColor={COLORS.button}
              editable={!isSaving}
            />
          </View>

          {/* Existing post image displayed at the bottom for reference — read only on this screen */}
          {post.image && (
            <View style={styles.imageContainer}>
              <SupabaseImage path={post.image} style={styles.postImage} />
            </View>
          )}

          {/* Bottom padding to prevent content being hidden behind the keyboard */}
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
  saveButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.disableBtn,
    opacity: 0.5,
  },
  saveText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
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
    fontSize: 20,
    fontWeight: "600",
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
    minHeight: 150,
    textAlignVertical: "top",
  },
  imageContainer: {
    marginTop: 20,
  },
  postImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
