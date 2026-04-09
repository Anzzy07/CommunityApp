import { COLORS } from "@/src/colors";
import { useSyncUserToSupabase } from "@/src/hooks/mutations/useUserMutations";
import { imageUriToClerkFile } from "@/src/utils/imageUtils";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
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

export default function EditProfileScreen() {
  const { user } = useUser();
  const router = useRouter();
  const syncUserMutation = useSyncUserToSupabase();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [username, setUsername] = useState(user?.username || "");
  const [profileImage, setProfileImage] = useState(user?.imageUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const uploadProfileImage = async (imageUri: string) => {
    setIsUploading(true);
    try {
      const blob = await imageUriToClerkFile(imageUri);
      await user?.setProfileImage({ file: blob });

      // Sync to Supabase after upload
      if (user?.id && user?.emailAddresses[0]?.emailAddress) {
        await syncUserMutation.mutateAsync({
          userId: user.id,
          email: user.emailAddresses[0].emailAddress,
          fullName: user.fullName,
          username: user.username,
          imageUrl: user.imageUrl,
        });
      }

      setProfileImage(imageUri);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Error", "Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photos to upload a profile picture.",
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
      await uploadProfileImage(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
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
      await uploadProfileImage(result.assets[0].uri);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert("Change Profile Picture", "Choose an option", [
      { text: "Take Photo", onPress: handleTakePhoto },
      { text: "Choose from Gallery", onPress: handlePickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Full name cannot be empty");
      return;
    }

    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    setIsSaving(true);

    try {
      // Update Clerk
      await user?.update({
        firstName: fullName.split(" ")[0],
        lastName: fullName.split(" ").slice(1).join(" ") || undefined,
        username: username,
      });

      // Sync to Supabase
      if (user?.id && user?.emailAddresses[0]?.emailAddress) {
        await syncUserMutation.mutateAsync({
          userId: user.id,
          email: user.emailAddresses[0].emailAddress,
          fullName: fullName,
          username: username,
          imageUrl: user.imageUrl,
        });
      }

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error updating profile:", error);

      if (error.errors && error.errors[0]?.code === "form_identifier_exists") {
        Alert.alert("Error", "This username is already taken");
      } else {
        Alert.alert("Error", "Failed to update profile. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="close" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <Pressable onPress={handleSave} disabled={isSaving} hitSlop={10}>
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveText}>Save</Text>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri: profileImage || "https://via.placeholder.com/100",
                }}
                style={styles.avatar}
              />
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator color="white" size="large" />
                </View>
              )}
            </View>

            <Pressable
              onPress={handleChangePhoto}
              disabled={isUploading}
              style={styles.changePhotoButton}
            >
              <MaterialCommunityIcons
                name="camera"
                size={18}
                color={COLORS.primary}
              />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </Pressable>
          </View>

          {/* Full Name */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={COLORS.textSecondary}
              />
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                style={styles.input}
              />
            </View>
          </View>

          {/* Username */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons
                name="at"
                size={20}
                color={COLORS.textSecondary}
              />
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                style={styles.input}
              />
            </View>
            <Text style={styles.hint}>
              Your username is visible to everyone
            </Text>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.inputSection}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.disabledContainer]}>
              <MaterialCommunityIcons
                name="email"
                size={20}
                color={COLORS.textSecondary}
              />
              <Text style={styles.disabledText}>
                {user?.emailAddresses[0]?.emailAddress || "No email"}
              </Text>
            </View>
            <Text style={styles.hint}>
              Email is managed by your account settings
            </Text>
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.infoText}>
              Changes will be reflected across your posts and comments
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
    fontSize: 24,
    fontWeight: "600",
  },
  saveText: {
    color: "white",
    fontWeight: "600",
    fontSize: 22,
  },
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
    paddingTop: 20,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: "white",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  changePhotoButton: {
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
  changePhotoText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 18,
  },
  inputSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18, // 14 → 16
    fontWeight: "600",
    color: "white",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  disabledContainer: {
    backgroundColor: "#F3F4F6",
  },
  disabledText: {
    flex: 1,
    fontSize: 18,
    color: COLORS.textSecondary,
  },
  hint: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginTop: 6,
    marginLeft: 4,
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: "white",
    lineHeight: 20,
  },
});
