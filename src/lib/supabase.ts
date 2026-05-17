import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import { Database } from "../types/database.types";

// Read connection values from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Create a single shared Supabase client for the entire app.
// AsyncStorage is used as the auth persistence layer so the session
// survives app restarts on the device.
// autoRefreshToken and persistSession are disabled because authentication
// is handled entirely by Clerk — Supabase is used only as a database.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Pause and resume the Supabase auth refresh cycle based on whether the app
// is in the foreground. This prevents unnecessary background network activity
// while still keeping real-time subscriptions alive when the app is active.
AppState.addEventListener("change", (state) => {
  if (state === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
