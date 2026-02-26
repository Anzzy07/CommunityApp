import { Group } from "@/src/types";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// Fetches all groups with member counts

export function useSupabaseGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Transform to match your Group type
      const groupsData = (data || []).map((group) => ({
        id: group.id,
        name: group.name,
        image: group.image_url,
        leader_id: group.leader_id,
      }));

      setGroups(groupsData as Group[]);
    } catch (err: any) {
      console.error("Error fetching groups:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchGroups();
  };

  return { groups, loading, error, refetch };
}
