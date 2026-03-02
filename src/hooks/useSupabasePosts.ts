import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all posts from Supabase with user and group details using React Query
export function useSupabasePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      // Fetch posts with user and group information
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

      // For each post, fetch counts and poll data
      const postsWithCounts = await Promise.all(
        (data || []).map(async (post: any) => {
          // Count comments for this post
          const { count: commentCount } = await supabase
            .from("comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Count awards for this post
          const { count: awardCount } = await supabase
            .from("post_awards")
            .select("*", { count: "exact", head: true })
            .eq("post_id", post.id);

          // Fetch poll if this post has one
          const { data: pollData } = await supabase
            .from("polls")
            .select(
              `
              id,
              post_id,
              question,
              created_at,
              poll_options (
                id,
                poll_id,
                text,
                votes_count
              )
            `,
            )
            .eq("post_id", post.id)
            .single();

          // Supabase returns user/group as array, extract first item
          const userData = Array.isArray(post.user) ? post.user[0] : post.user;
          const groupData = Array.isArray(post.group)
            ? post.group[0]
            : post.group;

          // Transform poll data to match app types
          const pollTransformed = pollData
            ? {
                id: pollData.id,
                post_id: pollData.post_id,
                question: pollData.question,
                created_at: pollData.created_at,
                options: (pollData.poll_options || []).map((opt: any) => ({
                  id: opt.id,
                  poll_id: opt.poll_id,
                  text: opt.text,
                  votes_count: opt.votes_count,
                })),
              }
            : null;

          // Transform to match Post type
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
            poll: pollTransformed,
          };
        }),
      );

      return postsWithCounts as Post[];
    },
    staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
    gcTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
}
