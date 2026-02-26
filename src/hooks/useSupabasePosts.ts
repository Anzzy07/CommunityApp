import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { useEffect, useState } from "react";

// Fetches all posts from Supabase with user and group details

export function useSupabasePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("posts")
        .select(
          `
          id,
          title,
          description,
          image_url,
          upvotes,
          created_at,
          user:users!user_id (
            id,
            username,
            full_name,
            image_url
          ),
          group:groups!group_id (
            id,
            name,
            image_url,
            leader_id
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      // Get comment counts for each post
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post: any) => {
          const { count: commentCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          const { count: awardCount } = await supabase
            .from("post_awards")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Supabase returns user as array, we need first item
          const userData = Array.isArray(post.user) ? post.user[0] : post.user;
          const groupData = Array.isArray(post.group)
            ? post.group[0]
            : post.group;

          // Transform to match your Post type
          return {
            id: post.id,
            title: post.title,
            description: post.description,
            image: post.image_url,
            upvotes: post.upvotes,
            nr_of_comments: commentCount || 0,
            created_at: post.created_at,
            user: {
              id: userData.id,
              name: userData.full_name || userData.username,
              image: userData.image_url,
            },
            group: {
              id: groupData.id,
              name: groupData.name,
              image: groupData.image_url,
              leader_id: groupData.leader_id,
            },
            poll: null, // TODO: Fetch poll if exists
          };
        }),
      );

      setPosts(postsWithCounts as Post[]);
    } catch (err: any) {
      console.error("Error fetching posts:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    fetchPosts();
  };

  return { posts, loading, error, refetch };
}

import { Group } from "@/src/types";

/**
 * Fetches all groups with member counts
 */
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
