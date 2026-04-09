import { COLORS } from "@/src/colors";
import { useCreateGroup } from "@/src/hooks/mutations/useGroupMutations";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
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

export default function CreateCommunityScreen() {
  const { user } = useUser();
  const createGroupMutation = useCreateGroup();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [communityImage, setCommunityImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Opens image picker to select community icon
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos to upload a community icon.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      setCommunityImage(result.assets[0].uri);
      setIsUploading(false);
    }
  };

  // Opens camera to take a photo for community icon
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow camera access to take a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsUploading(true);
      setCommunityImage(result.assets[0].uri);
      setIsUploading(false);
    }
  };

  // Shows options for picking image
  const handleChangeImage = () => {
    Alert.alert("Community Icon", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Creates new community and redirects to community details
  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter a community name");
      return;
    }

    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to create a community");
      return;
    }

    try {
      const newGroup = await createGroupMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        imageUri: communityImage || "https://via.placeholder.com/80",
        userId: user.id,
      });

      // Reset form
      setName("");
      setDescription("");
      setCommunityImage(null);

      // Navigate to the new community
      router.replace(`/community/${newGroup.id}`);
    } catch (error) {
      Alert.alert("Error", "Failed to create community. Please try again.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="close" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Create Community</Text>

        <Pressable
          onPress={handleCreate}
          disabled={!name.trim() || createGroupMutation.isPending}
          hitSlop={10}
        >
          {createGroupMutation.isPending ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={[styles.createText, !name.trim() && { opacity: 0.5 }]}>
              Create
            </Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.imageSection}>
            <View style={styles.imageContainer}>
              {communityImage ? (
                <Image
                  source={{ uri: communityImage }}
                  style={styles.communityImage}
                />
              ) : (
                <View style={styles.placeholderImage}>
                  <MaterialCommunityIcons
                    name="account-group"
                    size={40}
                    color={COLORS.textSecondary}
                  />
                </View>
              )}

              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="white" size="large" />
                </View>
              )}
            </View>

            <Pressable
              onPress={handleChangeImage}
              disabled={isUploading}
              style={styles.changeImageButton}
            >
              <MaterialCommunityIcons
                name="camera"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.changeImageText}>
                {communityImage ? "Change Icon" : "Add Icon"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Community Name</Text>
            <TextInput
              placeholder="e.g., Fitness Enthusiasts, Book Club"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              style={styles.input}
              maxLength={50}
            />
            <Text style={styles.charCount}>{name.length}/50</Text>
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Description (Optional)</Text>
            <TextInput
              placeholder="What is this community about?"
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, styles.textArea]}
              maxLength={200}
            />
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.infoText}>
              You'll be the admin of this community and can create challenges
              for members.
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
  scrollContent: {
    padding: 20,
  },
  imageSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 10,
  },
  imageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  communityImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "white",
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 4,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  changeImageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  changeImageText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 18,
  },
  inputWrapper: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
    fontSize: 17,
    color: "white",
    lineHeight: 20,
  },
});
