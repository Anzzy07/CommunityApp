import { supabase } from "@/src/lib/supabase";
import { UserStreak } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Returns false if user missed a day streak should show as 0
function isStreakAlive(lastActiveDateStr: string | null): boolean {
  if (!lastActiveDateStr) return false;
  const lastActive = new Date(lastActiveDateStr);
  lastActive.setHours(0, 0, 0, 0);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return lastActive >= yesterday;
}

// Get all user streaks when no userId provided or get single streak when userId provided
export function useSupabaseUserStreaks(userId?: string) {
  return useQuery({
    queryKey: userId ? ["user-streak", userId] : ["user-streaks"],
    queryFn: async () => {
      if (userId) {
        const { data, error } = await supabase
          .from("user_streaks")
          .select("*")
          .eq("user_id", userId)
          .single();

        if (error) {
          if (error.code === "PGRST116") return null; // no row found
          throw error;
        }

        const alive = isStreakAlive(data.last_active_date);

        const streak: UserStreak = {
          user_id: data.user_id,
          // If they missed a day show 0 don't show stale streak
          current_streak: alive ? (data.current_streak ?? 0) : 0,
          longest_streak: data.longest_streak ?? 0,
          last_active_date: data.last_active_date,
        };

        return streak;
      } else {
        const { data, error } = await supabase.from("user_streaks").select("*");
        if (error) throw error;
        return data || [];
      }
    },
    enabled: true,
    staleTime: 1000 * 60 * 5,
  });
}

// Get streak for a specific user used on profile pages
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

      if (error) {
        if (error.code === "PGRST116") return null; // no row
        throw error;
      }

      const alive = isStreakAlive(data.last_active_date);

      // Return typed UserStreak with stale safe current streak
      const streak: UserStreak = {
        user_id: data.user_id,
        current_streak: alive ? (data.current_streak ?? 0) : 0,
        longest_streak: data.longest_streak ?? 0,
        last_active_date: data.last_active_date,
      };

      return streak;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
