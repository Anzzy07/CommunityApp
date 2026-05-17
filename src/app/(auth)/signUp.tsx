import { COLORS } from "@/src/colors";
import { useSignUp } from "@clerk/clerk-expo";
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

// This screen allows users to create a new account
// After signing up, user must verify email using a 6 digit code
export default function SignUpScreen() {
  // Clerk hook for sign up process
  const { isLoaded, signUp, setActive } = useSignUp();

  // Router for navigation
  const router = useRouter();

  // State for storing user inputs
  const [emailAddress, setEmailAddress] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");

  // State to control verification step
  const [pendingVerification, setPendingVerification] = React.useState(false);

  // State for verification code
  const [code, setCode] = React.useState("");

  // State to toggle password visibility
  const [showPassword, setShowPassword] = React.useState(false);

  // State for loading indicator
  const [isLoading, setIsLoading] = React.useState(false);

  // Handles sign up button press
  const onSignUpPress = async () => {
    // Stop if Clerk is not ready
    if (!isLoaded || !signUp) return;

    // Check if all fields are filled
    if (!emailAddress || !username || !password) {
      Alert.alert("Missing Information", "Please fill in all fields");
      return;
    }

    // Check password strength
    if (password.length < 8) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters long",
      );
      return;
    }

    setIsLoading(true);

    try {
      // Create new user account
      await signUp.create({ emailAddress, username, password });

      // Send verification code to email
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      // Move to verification screen
      setPendingVerification(true);
    } catch (err: any) {
      // Show error if sign up fails
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Sign Up Failed",
        err.errors?.[0]?.message || "Unable to create account",
      );
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  };

  // Handles verification of email using code
  const onVerifyPress = async () => {
    // Stop if Clerk is not ready
    if (!isLoaded || !signUp) return;

    // Check if code is valid
    if (!code || code.length < 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code");
      return;
    }

    setIsLoading(true);

    try {
      // Verify the email code
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      // If verification is successful
      if (completeSignUp.status === "complete") {
        // Activate user session
        await setActive({ session: completeSignUp.createdSessionId });

        // Redirect to home screen
        router.replace("/");
      }
    } catch (err: any) {
      // Show error if verification fails
      console.error(JSON.stringify(err, null, 2));
      Alert.alert(
        "Verification Failed",
        err.errors?.[0]?.message || "Invalid verification code",
      );
    } finally {
      // Stop loading
      setIsLoading(false);
    }
  };

  // Resends verification code to user's email
  const onResendCode = async () => {
    // Stop if Clerk is not ready
    if (!isLoaded || !signUp) return;

    try {
      // Send new verification code
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });

      Alert.alert(
        "Code Sent",
        "A new verification code has been sent to your email",
      );
    } catch (err: any) {
      // Show error if resend fails
      console.error(JSON.stringify(err, null, 2));
      Alert.alert("Error", "Unable to resend code");
    }
  };

  // Show verification UI if user has already signed up
  if (pendingVerification) {
    return (
      <View style={styles.container}>
        {/* Background design */}
        <View style={styles.waveBackground} />

        {/* Prevent keyboard overlap */}
        <KeyboardAvoidingView
          style={styles.formContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Title */}
          <Text style={styles.title}>Verify Email</Text>

          {/* Instruction */}
          <Text style={styles.subtitle}>
            We've sent a 6-digit code to {emailAddress}
          </Text>

          {/* Code input */}
          <Text style={styles.label}>Verification Code</Text>
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

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={onVerifyPress}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? "Verifying..." : "Verify"}
            </Text>
          </TouchableOpacity>

          {/* Resend code */}
          <TouchableOpacity onPress={onResendCode} style={styles.resendButton}>
            <Text style={styles.resendText}>Didn't receive code? Resend</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Main sign up screen UI
  return (
    <View style={styles.container}>
      <View style={styles.waveBackground} />

      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Title */}
        <Text style={styles.title}>Sign Up</Text>

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
            placeholder="Enter email"
            placeholderTextColor="#aaa"
            onChangeText={setEmailAddress}
            keyboardType="email-address"
            autoComplete="email"
          />
        </View>

        {/* Username input */}
        <Text style={styles.label}>Username</Text>
        <View style={styles.inputWrapper}>
          <Ionicons
            name="person-outline"
            size={20}
            color={COLORS.primaryDark}
            style={styles.icon}
          />
          <TextInput
            style={styles.input}
            autoCapitalize="none"
            value={username}
            placeholder="Username"
            placeholderTextColor="#aaa"
            onChangeText={setUsername}
            autoComplete="username"
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
            placeholder="Enter password (min 8 characters)"
            placeholderTextColor="#aaa"
            secureTextEntry={!showPassword}
            onChangeText={setPassword}
            autoComplete="password-new"
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

        {/* Sign up button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={onSignUpPress}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Creating account..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

// Styles for layout and UI
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
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  resendButton: {
    marginTop: 20,
    alignItems: "center",
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
