import { supabase } from "@/src/lib/supabase";
import { UserStreak } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Get all user streaks (for general use)
export function useSupabaseUserStreaks(userId?: string) {
  return useQuery({
    queryKey: userId ? ["user-streak", userId] : ["user-streaks"],
    queryFn: async () => {
      if (userId) {
        // If userId is provided, get that specific user's streak
        console.log("🔍 Fetching streak for user:", userId);

        const { data, error } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            console.log("⚠️ No streak found for user");
            return null;
          }
          console.error("❌ Error fetching streak:", error);
          throw error;
        }

        console.log("✅ Fetched streak:", data);

        const streak: UserStreak = {
          user_id: data.user_id,
          current_streak: data.current_streak,
          longest_streak: data.longest_streak,
          last_active_date: data.last_active_date,
        };

        return streak;
      } else {
        // If no userId, get all streaks
        const { data, error } = await supabase.from("user_streaks").select("*");

        if (error) throw error;
        return data || [];
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get streak for a specific user (backward compatibility)
export function useSupabaseUserStreak(userId?: string) {
  return useQuery({
    queryKey: ["user-streak", userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from("user_streaks")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
