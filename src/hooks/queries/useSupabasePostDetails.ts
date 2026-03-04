import { supabase } from "@/src/lib/supabase";
import { Comment, Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Fetches a single post with its comments from Supabase
export function useSupabasePostDetails(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      // Fetch the post
      const { data: postData, error: postError } = await supabase
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
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      if (!postData) throw new Error("Post not found");

      // Count comments
      const { count: commentCount } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

      // Count awards
      const { count: awardCount } = await supabase
        .from("post_awards")
        .select("*", { count: "exact", head: true })
        .eq("post_id", postId);

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
        .eq("post_id", postId)
        .single();

      // Fetch comments for this post
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(
          `
          id,
          post_id,
          user_id,
          parent_id,
          comment,
          created_at,
          upvotes,
          user:users!user_id (
            id,
            username,
            full_name,
            image_url
          )
        `,
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Transform post data
      const userData = Array.isArray(postData.user)
        ? postData.user[0]
        : postData.user;
      const groupData = Array.isArray(postData.group)
        ? postData.group[0]
        : postData.group;

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

      const post: Post = {
        id: postData.id,
        title: postData.title,
        description: postData.description,
        image: postData.image_url,
        upvotes: postData.upvotes,
        nr_of_comments: commentCount || 0,
        created_at: postData.created_at,
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

      // Transform comments data
      const comments: Comment[] = (commentsData || []).map((comment: any) => {
        const commentUser = Array.isArray(comment.user)
          ? comment.user[0]
          : comment.user;

        return {
          id: comment.id,
          post_id: comment.post_id,
          user_id: comment.user_id,
          parent_id: comment.parent_id,
          comment: comment.comment,
          created_at: comment.created_at,
          upvotes: comment.upvotes,
          user: {
            id: commentUser.id,
            name: commentUser.full_name || commentUser.username,
            image: commentUser.image_url,
          },
          replies: [], // Will need to build reply tree if needed
        };
      });

      return { post, comments };
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 2, // Data stays fresh for 2 minutes
  });
}
