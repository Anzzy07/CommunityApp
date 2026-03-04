import { supabase } from "@/src/lib/supabase";
import type { UserResource } from "@clerk/types";

// Syncs Clerk user data to Supabase users table

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

    // Use upsert to insert or update
    const { error } = await supabase
      .from("users")
      .upsert(userData, { onConflict: "id" });

    if (error) {
      console.error("Error syncing user to Supabase:", error);
      return { success: false, error };
    }

    console.log("✅ User synced to Supabase:", userData.username);
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
