import { supabase } from "@/src/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

// Creates a new challenge for a community — only leaders can do this
export function useCreateChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      title,
      description,
      duration,
      userId,
    }: {
      groupId: string;
      title: string;
      description?: string;
      duration: number; // number of days the challenge runs
      userId: string;
    }) => {
      const startDate = new Date();
      // Calculate end date by adding duration days in milliseconds
      const endDate = new Date(Date.now() + duration * 86400000);

      const { data, error } = await supabase
        .from("challenges")
        .insert({
          group_id: groupId,
          title,
          description: description || null,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          created_by: userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },

    onSuccess: (_data, variables) => {
      // Refresh the challenges list so the new challenge appears immediately
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({
        queryKey: ["challenges", variables.groupId],
      });
    },
  });
}
