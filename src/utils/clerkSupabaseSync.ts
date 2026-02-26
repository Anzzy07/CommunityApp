import { supabase } from "@/src/lib/supabase";
import type { UserResource } from "@clerk/types";

// Syncs Clerk user data to Supabase users table
// Call this after successful Clerk sign in

export async function syncClerkUserToSupabase(clerkUser: UserResource) {
  try {
    const { id, emailAddresses, username, firstName, lastName, imageUrl } =
      clerkUser;

    // Prepare user data
    const userData = {
      id: id,
      email: emailAddresses[0]?.emailAddress || "",
      username: username || emailAddresses[0]?.emailAddress.split("@")[0] || "",
      full_name: `${firstName || ""} ${lastName || ""}`.trim() || null,
      image_url: imageUrl || null,
    };

    // First, try to check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .single();

    if (existingUser) {
      // User exists, update it
      const { error } = await supabase
        .from("users")
        .update(userData)
        .eq("id", id);

      if (error) {
        console.error("Error updating user in Supabase:", error);
        return { success: false, error };
      }
    } else {
      // User doesn't exist, insert it
      const { error } = await supabase.from("users").insert(userData);

      if (error) {
        console.error("Error inserting user in Supabase:", error);
        console.log(
          "⚠️ RLS Policy Error: You need to run fix-users-rls.sql in Supabase",
        );
        return { success: false, error };
      }
    }

    console.log(" 🙈 User synced to Supabase:", userData.username);
    return { success: true, user: userData };
  } catch (err) {
    console.error("Error in syncClerkUserToSupabase:", err);
    return { success: false, error: err };
  }
}

// Checks if user exists in Supabase, creates if not

export async function ensureUserExistsInSupabase(clerkUser: UserResource) {
  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", clerkUser.id)
      .single();

    // If doesn't exist, sync
    if (!existingUser) {
      return await syncClerkUserToSupabase(clerkUser);
    }

    return { success: true, exists: true };
  } catch (err) {
    console.error("Error checking user existence:", err);
    return { success: false, error: err };
  }
}
