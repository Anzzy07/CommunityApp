import { supabase } from "@/src/lib/supabase";
import type { UserResource } from "@clerk/types";

// Write the Clerk user's current data to the Supabase users table.
// An upsert is used so this function is safe to call on every app launch —
// it creates the row on first sign-in and updates it whenever profile data changes.
export async function syncClerkUserToSupabase(clerkUser: UserResource) {
  try {
    const { id, emailAddresses, username, firstName, lastName, imageUrl } =
      clerkUser;

    // Build the row that will be written to Supabase.
    // Username falls back to the local part of the email address when not explicitly set.
    const userData = {
      id: id,
      email: emailAddresses[0]?.emailAddress || "",
      username: username || emailAddresses[0]?.emailAddress.split("@")[0] || "",
      full_name: `${firstName || ""} ${lastName || ""}`.trim() || null,
      image_url: imageUrl || null,
    };

    // onConflict: "id" means an existing row for this user is updated in place
    // rather than causing a duplicate key error
    const { error } = await supabase
      .from("users")
      .upsert(userData, { onConflict: "id" });

    if (error) {
      console.error("Error syncing user to Supabase:", error);
      return { success: false, error };
    }

    console.log("🖼️ Welcome :", userData.username);
    return { success: true, user: userData };
  } catch (err) {
    console.error("Error in syncClerkUserToSupabase:", err);
    return { success: false, error: err };
  }
}

// Check whether the user already exists in Supabase and create them if not.
export async function ensureUserExistsInSupabase(clerkUser: UserResource) {
  try {
    // Select only the id column to minimise data transferred over the network
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", clerkUser.id)
      .single();

    // User is not yet in the database — perform a full sync to create the row
    if (!existingUser) {
      return await syncClerkUserToSupabase(clerkUser);
    }

    return { success: true, exists: true };
  } catch (err) {
    console.error("Error checking user existence:", err);
    return { success: false, error: err };
  }
}
