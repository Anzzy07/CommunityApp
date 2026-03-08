import { supabase } from "@/src/lib/supabase";
import { useQuery } from "@tanstack/react-query";

export function useSupabaseUserStreaks() {
  return useQuery({
    queryKey: ["user-streaks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_streaks").select("*");

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get streak for a specific user
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

      if (error && error.code !== "PGRST116") throw error; // Ignore "not found" error
      return data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  });
}
