import { COLORS } from "@/src/colors";
import { useSignIn } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
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

// This screen allows users to sign in using email and password
// It also supports remember me and forgot password features
export default function Page() {
  // Clerk hook for authentication
  const { signIn, setActive, isLoaded } = useSignIn();

  // Router for navigation
  const router = useRouter();

  // State for storing email input
  const [emailAddress, setEmailAddress] = React.useState("");

  // State for storing password input
  const [password, setPassword] = React.useState("");

  // State to track remember me checkbox
  const [rememberMe, setRememberMe] = React.useState(false);

  // State to toggle password visibility
  const [showPassword, setShowPassword] = React.useState(false);

  // State for loading indicator
  const [isLoading, setIsLoading] = React.useState(false);

  // Runs when screen loads to get saved email if user selected remember me before
  React.useEffect(() => {
    loadSavedCredentials();
  }, []);

  // Loads saved email and remember me status from secure storage
  const loadSavedCredentials = async () => {
    try {
      const savedEmail = await SecureStore.getItemAsync("savedEmail");
      const wasRemembered = await SecureStore.getItemAsync("rememberMe");

      // If user had selected remember me, fill the email automatically
      if (savedEmail && wasRemembered === "true") {
        setEmailAddress(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      console.error("Error loading saved credentials:", error);
    }
  };

  // Saves or removes email from secure storage based on remember me selection
  const handleRememberMe = async (shouldRemember: boolean) => {
    try {
      if (shouldRemember && emailAddress) {
        // Save email and flag
        await SecureStore.setItemAsync("savedEmail", emailAddress);
        await SecureStore.setItemAsync("rememberMe", "true");
      } else {
        // Remove saved data
        await SecureStore.deleteItemAsync("savedEmail");
        await SecureStore.deleteItemAsync("rememberMe");
      }
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  // Handles sign in when user presses login button
  const onSignInPress = React.useCallback(async () => {
    // Stop if Clerk is not ready
    if (!isLoaded || !signIn) return;

    setIsLoading(true);

    try {
      // Attempt to sign in with email and password
      const signInAttempt = await signIn.create({
        identifier: emailAddress,
        password,
      });

      // If login is successful
      if (signInAttempt.status === "complete") {
        // Save email if remember me is checked
        await handleRememberMe(rememberMe);

        // Activate session
        await setActive({ session: signInAttempt.createdSessionId });

        // Redirect to home screen
        router.replace("/");
      }
    } catch (err: any) {
      // Show error if login fails
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Sign In Failed",
        err.errors?.[0]?.message || "Invalid email or password",
      );
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  }, [isLoaded, signIn, emailAddress, password, rememberMe]);

  // Handles forgot password flow
  const onForgotPasswordPress = async () => {
    // Stop if Clerk is not ready
    if (!isLoaded || !signIn) return;

    // Check if email is entered
    if (!emailAddress) {
      Alert.alert(
        "Email Required",
        "Please enter your email address to reset your password",
      );
      return;
    }

    try {
      // Send reset code to user's email
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: emailAddress,
      });

      // Show message and go to reset screen
      Alert.alert(
        "Reset Email Sent",
        "Check your email for a password reset code",
        [
          {
            text: "OK",
            onPress: () => router.push("/resetPassword"),
          },
        ],
      );
    } catch (err: any) {
      // Show error if request fails
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Error",
        err.errors?.[0]?.message || "Unable to send reset email",
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Background design */}
      <View style={styles.waveBackground} />

      {/* Prevent keyboard from covering inputs */}
      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Title */}
        <Text style={styles.title}>Sign in</Text>

        {/* Email input */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color={COLORS.primaryDark}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={emailAddress}
            placeholder="demo@email.com"
            placeholderTextColor="#aaa"
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        {/* Password input */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={COLORS.primaryDark}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            value={password}
            placeholder="enter your password"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            onChangeText={setPassword}
            autoComplete="password"
          />

          {/* Toggle password visibility */}
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

        {/* Remember me and forgot password row */}
        <View style={styles.row}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setRememberMe(!rememberMe)}
          >
            {/* Custom checkbox */}
            <View
              style={[styles.checkbox, rememberMe && styles.checkboxFilled]}
            >
              {rememberMe && <Text style={styles.check}>✓</Text>}
            </View>
            <Text style={styles.checkboxText}>Remember Me</Text>
          </TouchableOpacity>

          {/* Forgot password button */}
          <TouchableOpacity onPress={onForgotPasswordPress}>
            <Text style={styles.forgot}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {/* Login button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onSignInPress}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Signing in..." : "Login"}
          </Text>
        </TouchableOpacity>

        {/* Sign up navigation */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>Don't have an Account? </Text>
          <Link href="/signUp" asChild>
            <TouchableOpacity>
              <Text style={styles.signupLink}>Sign up</Text>
            </TouchableOpacity>
          </Link>
        </View>
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
    marginBottom: 40,
    textAlign: "left",
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.checkbox,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxFilled: {
    backgroundColor: COLORS.checkbox,
  },
  check: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  checkboxText: {
    color: COLORS.primaryDark,
    fontSize: 15,
  },
  forgot: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: "600",
  },
  button: {
    backgroundColor: COLORS.button,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    marginBottom: 30,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  signupText: {
    color: COLORS.primaryDark,
    fontSize: 16,
  },
  signupLink: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
});
