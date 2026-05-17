import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";

// Redirects signed in users to the main app and shows auth screens for guests
export default function AuthLayout() {
  const { isSignedIn } = useAuth();

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  return (
    <Stack>
      <Stack.Screen name="signIn" options={{ title: "Sign In" }} />
      <Stack.Screen name="signUp" options={{ title: "Sign Up" }} />
      <Stack.Screen
        name="resetPassword"
        options={{ title: "Reset Password" }}
      />
    </Stack>
  );
}
