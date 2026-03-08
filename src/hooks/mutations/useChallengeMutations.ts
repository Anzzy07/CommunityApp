import { supabase } from "@/src/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";

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
      duration: number; // days
      userId: string;
    }) => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + duration * 86400000); // days to ms

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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({
        queryKey: ["challenges", variables.groupId],
      });
    },
  });
}
