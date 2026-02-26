import { GroupMember } from "@/src/types";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Fetches all group memberships for the current user

export function useSupabaseGroupMembers(userId: string) {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchMembers();
    }
  }, [userId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("group_members")
        .select("*");

      if (fetchError) throw fetchError;

      setMembers((data || []) as GroupMember[]);
    } catch (err: any) {
      console.error("Error fetching group members:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Joins a group
  const joinGroup = async (groupId: string) => {
    try {
      const { error: insertError } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: userId,
        });

      if (insertError) throw insertError;

      await fetchMembers(); // Refetch
      return { success: true };
    } catch (err: any) {
      console.error("Error joining group:", err);
      return { success: false, error: err.message };
    }
  };

  // Leaves a group
  const leaveGroup = async (groupId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      await fetchMembers(); // Refetch
      return { success: true };
    } catch (err: any) {
      console.error("Error leaving group:", err);
      return { success: false, error: err.message };
    }
  };

  return {
    members,
    loading,
    error,
    joinGroup,
    leaveGroup,
    refetch: fetchMembers,
  };
}
