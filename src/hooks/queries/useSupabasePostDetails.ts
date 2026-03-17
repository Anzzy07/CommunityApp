import { supabase } from "@/src/lib/supabase";
import { Comment, Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Helper function to build nested comment tree
function buildCommentTree(comments: any[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create all comment objects
  comments.forEach((comment: any) => {
    const commentUser = Array.isArray(comment.user)
      ? comment.user[0]
      : comment.user;

    const commentObj: Comment = {
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      parent_id: comment.parent_id,
      comment: comment.comment,
      created_at: comment.created_at,
      upvotes: comment.upvotes ?? 0,
      user: {
        id: commentUser?.id || comment.user_id,
        name: commentUser?.full_name || commentUser?.username || "Unknown",
        image: commentUser?.image_url || null,
      },
      replies: [],
    };

    commentMap.set(comment.id, commentObj);
  });

  // Second pass: build the tree
  commentMap.forEach((comment) => {
    if (comment.parent_id) {
      // This is a reply then add it to parent's replies
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(comment);
      } else {
        // Parent not found then treat as root
        rootComments.push(comment);
      }
    } else {
      // Root comment
      rootComments.push(comment);
    }
  });

  return rootComments;
}

// Fetches a single post with its comments from Supabase
export function useSupabasePostDetails(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      // Fetch the post using the view
      const { data: postData, error: postError } = await supabase
        .from("posts_with_details")
        .select("*")
        .eq("id", postId)
        .single();

      if (postError) throw postError;
      if (!postData) throw new Error("Post not found");

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
            votes_count,
            image_url
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
              image_url: opt.image_url,
            })),
          }
        : null;

      // Transform post data with proper null handling
      const post: Post = {
        id: postData.id || "",
        title: postData.title || "Untitled",
        description: postData.description,
        image: postData.image_url,
        upvotes: postData.upvotes ?? 0,
        nr_of_comments: postData.comment_count ?? 0,
        created_at: postData.created_at,
        user: {
          id: postData.user_id || "",
          name: postData.full_name || postData.username || "Unknown",
          image: postData.user_image || null,
        },
        group: {
          id: postData.group_id || "",
          name: postData.group_name || "Unknown Group",
          image: postData.group_image || "",
        },
        poll: pollTransformed,
      };

      // Build comment tree
      const comments = buildCommentTree(commentsData || []);

      return { post, comments };
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
