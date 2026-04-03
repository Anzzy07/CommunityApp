import { supabase } from "@/src/lib/supabase";
import { Comment, PollOption, Post } from "@/src/types";
import { useQuery } from "@tanstack/react-query";

// Returns false if user missed a day (streak should show 0)
function isStreakAlive(lastActiveDateStr: string | null): boolean {
  if (!lastActiveDateStr) return false;
  const lastActive = new Date(lastActiveDateStr);
  lastActive.setHours(0, 0, 0, 0);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  return lastActive >= yesterday;
}

function buildCommentTree(comments: any[]): Comment[] {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

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

  commentMap.forEach((comment) => {
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies.push(comment);
      } else {
        rootComments.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
}

export function useSupabasePostDetails(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      // Fetch post, poll, comments, and streak in parallel
      const [postResult, pollResult, commentsResult] = await Promise.all([
        supabase
          .from("posts_with_details")
          .select("*")
          .eq("id", postId)
          .single(),

        supabase
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
          .single(),

        supabase
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
          .order("created_at", { ascending: true }),
      ]);

      if (postResult.error) throw postResult.error;
      if (!postResult.data) throw new Error("Post not found");
      if (commentsResult.error) throw commentsResult.error;

      const postData = postResult.data;
      const pollData = postResult.error ? null : pollResult.data;

      // Fetch streak for the post author
      const { data: streakData } = await supabase
        .from("user_streaks")
        .select("current_streak, last_active_date")
        .eq("user_id", postData.user_id as string)
        .single();

      const alive = isStreakAlive(
        (streakData?.last_active_date as string | null) ?? null,
      );
      const streak = alive
        ? ((streakData?.current_streak as number | null) ?? 0)
        : 0;

      // Transform poll
      const pollTransformed = pollData
        ? {
            id: pollData.id,
            post_id: pollData.post_id,
            question: pollData.question,
            created_at: pollData.created_at,
            options: ((pollData.poll_options as any[]) || []).map(
              (opt): PollOption => ({
                id: opt.id,
                poll_id: opt.poll_id,
                text: opt.text,
                votes_count: (opt.votes_count as number | null) ?? 0,
                image_url: opt.image_url ?? null,
              }),
            ),
          }
        : null;

      // Transform post — streak now included
      const post: Post = {
        id: (postData.id as string) ?? "",
        title: (postData.title as string) ?? "Untitled",
        description: (postData.description as string | null) ?? null,
        image: (postData.image_url as string | null) ?? null,
        upvotes: (postData.upvotes as number | null) ?? 0,
        nr_of_comments: (postData.comment_count as number | null) ?? 0,
        created_at: (postData.created_at as string | null) ?? null,
        streak,
        user: {
          id: (postData.user_id as string) ?? "",
          name:
            (postData.full_name as string | null) ??
            (postData.username as string | null) ??
            "Unknown",
          image: (postData.user_image as string | null) ?? null,
        },
        group: {
          id: (postData.group_id as string) ?? "",
          name: (postData.group_name as string | null) ?? "Unknown Group",
          image: (postData.group_image as string | null) ?? null,
        },
        poll: pollTransformed,
      };

      const comments = buildCommentTree(commentsResult.data || []);

      return { post, comments };
    },
    enabled: !!postId,
    staleTime: 1000 * 60 * 2,
  });
}
