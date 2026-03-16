import { supabase } from "@/src/lib/supabase";
import { useMutation } from "@tanstack/react-query";

export function useSyncUserToSupabase() {
  return useMutation({
    mutationFn: async ({
      userId,
      email,
      fullName,
      username,
      imageUrl,
    }: {
      userId: string;
      email: string;
      fullName?: string | null;
      username?: string | null;
      imageUrl?: string | null;
    }) => {
      const { error } = await supabase.from("users").upsert(
        {
          id: userId,
          email,
          full_name: fullName,
          username,
          image_url: imageUrl,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        },
      );

      if (error) {
        console.error("❌ Error syncing user to Supabase:");
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        console.error("Error details:", error.details);
        console.error("Error hint:", error.hint);
        throw error;
      }

      // console.log("User synced to Supabase successfully");
    },
  });
}
