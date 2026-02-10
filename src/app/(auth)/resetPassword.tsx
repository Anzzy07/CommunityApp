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

export default function ResetPasswordScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();

  const [code, setCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  const onResetPasswordPress = async () => {
    if (!isLoaded || !signIn) return;

    if (!code || code.length < 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit reset code");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters long",
      );
      return;
    }

    setIsLoading(true);
    try {
      // Attempt to reset the password using the code and new password
      const resetAttempt = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (resetAttempt.status === "complete") {
        await setActive({ session: resetAttempt.createdSessionId });
        Alert.alert("Success", "Your password has been reset successfully", [
          {
            text: "OK",
            onPress: () => router.replace("/"),
          },
        ]);
      }
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Reset Failed",
        err.errors?.[0]?.message ||
          "Unable to reset password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.waveBackground} />

      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the code sent to your email and create a new password
        </Text>

        <Text style={styles.label}>Reset Code</Text>
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

        <Text style={styles.label}>New Password</Text>
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

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onResetPasswordPress}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Resetting..." : "Reset Password"}
          </Text>
        </TouchableOpacity>

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
