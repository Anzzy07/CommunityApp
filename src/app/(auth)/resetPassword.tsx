import { COLORS } from "@/src/colors";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// This screen lets users reset their password using a code sent to email
export default function ResetPasswordScreen() {
  // Clerk hook to handle sign-in related actions
  const { isLoaded, signIn, setActive } = useSignIn();

  // Router for navigation between screens
  const router = useRouter();

  // State to store reset code input
  const [code, setCode] = React.useState("");

  // State to store new password input
  const [newPassword, setNewPassword] = React.useState("");

  // State to toggle password visibility
  const [showPassword, setShowPassword] = React.useState(false);

  // State to show loading when request is processing
  const [isLoading, setIsLoading] = React.useState(false);

  // Function to handle password reset when button is pressed
  const onResetPasswordPress = async () => {
    // Stop if Clerk is not ready
    if (!isLoaded || !signIn) return;

    // Check if code is valid
    if (!code || code.length < 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit reset code");
      return;
    }

    // Check if password is strong enough
    if (!newPassword || newPassword.length < 8) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters long",
      );
      return;
    }

    // Start loading
    setIsLoading(true);

    try {
      // Attempt password reset using Clerk
      const resetAttempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      // If reset is successful
      if (resetAttempt.status === "complete") {
        // Activate the new session
        await setActive({ session: resetAttempt.createdSessionId });

        // Show success message and redirect to home
        Alert.alert("Success", "Your password has been reset successfully", [
          {
            text: "OK",
            onPress: () => router.replace("/"),
          },
        ]);
      }
    } catch (err: any) {
      // Show error message if reset fails
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Reset Failed",
        err.errors?.[0]?.message ||
          "Unable to reset password. Please try again.",
      );
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background design element */}
      <View style={styles.waveBackground} />

      {/* Prevent keyboard from covering inputs */}
      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Screen title */}
        <Text style={styles.title}>Reset Password</Text>

        {/* Short instruction for user */}
        <Text style={styles.subtitle}>
          Enter the code sent to your email and create a new password
        </Text>

        {/* Input label for reset code */}
        <Text style={styles.label}>Reset Code</Text>

        {/* Input field with icon for code */}
        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color={COLORS.primaryDark}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            value={code}
            placeholder="Enter 6-digit code"
            placeholderTextColor="#aaa"
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
          />
        </View>

        {/* Input label for new password */}
        <Text style={styles.label}>New Password</Text>

        {/* Password input with show/hide toggle */}
        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={COLORS.primaryDark}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            placeholder="Enter new password (min 8 characters)"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            onChangeText={setNewPassword}
          />

          {/* Button to toggle password visibility */}
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? "eye-outline" : "eye-off-outline"}
              size={22}
              color={COLORS.primaryDark}
            />
          </TouchableOpacity>
        </View>

        {/* Reset button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onResetPasswordPress}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Resetting..." : "Reset Password"}
          </Text>
        </TouchableOpacity>

        {/* Back navigation button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>Back to Sign In</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  waveBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
    backgroundColor: COLORS.wave,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 80,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.primaryDark,
    marginBottom: 20,
    textAlign: "left",
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.primaryDark,
    marginBottom: 30,
    lineHeight: 22,
  },
  label: {
    fontSize: 16,
    color: COLORS.primaryDark,
    marginBottom: 8,
    marginLeft: 5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    alignItems: "center",
    padding: 10,
  },
  backText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
