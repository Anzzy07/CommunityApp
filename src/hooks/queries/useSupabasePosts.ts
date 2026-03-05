import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches all posts from Supabase using the posts_with_details view
export function useSupabasePosts() {
  return useQuery({
    queryKey: ["posts"],
    queryFn: async () => {
      // Use the posts_with_details view which has everything pre-joined
      const { data, error } = await supabase
        .from("posts_with_details")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For each post, fetch poll data if needed
      const postsWithPolls = await Promise.all(
        (data || []).map(async (post: any) => {
          // Fetch poll if exists
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

          // Transform poll data
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

          // Transform to match Post type with proper null handling
          return {
            id: post.id || "",
            title: post.title || "Untitled",
            description: post.description,
            image: post.image_url,
            upvotes: post.upvotes ?? 0,
            nr_of_comments: post.comment_count ?? 0,
            created_at: post.created_at,
            user: {
              id: post.user_id || "",
              name: post.full_name || post.username || "Unknown",
              image: post.user_image || null,
            },
            group: {
              id: post.group_id || "",
              name: post.group_name || "Unknown Group",
              image: post.group_image || "",
            },
            poll: pollTransformed,
          } as Post;
        }),
      );

      return postsWithPolls;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
