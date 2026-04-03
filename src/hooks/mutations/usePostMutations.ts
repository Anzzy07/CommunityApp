import { supabase } from "@/src/lib/supabase";
import { Post } from "@/src/types";
import { uploadImage } from "@/src/utils/supabaseImages";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Alert, Share } from "react-native";

// Helper: update a single post inside infinite query pages
function patchPost(
  old: any,
  postId: string,
  updater: (post: Post) => Post,
): any {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page: Post[]) =>
      page.map((post) => (post.id === postId ? updater(post) : post)),
    ),
  };
}

// Helper: remove a post from infinite query pages
function removePost(old: any, postId: string): any {
  if (!old?.pages) return old;
  return {
    ...old,
    pages: old.pages.map((page: Post[]) =>
      page.filter((post) => post.id !== postId),
    ),
  };
}

// Vote on a post — fully optimistic, UI updates instantly
export function usePostVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      voteType,
    }: {
      postId: string;
      userId: string;
      voteType: "up" | "down";
    }) => {
      const { data: existingVote } = await supabase
        .from("post_votes")
        .select("vote_type")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Same vote → remove (un-vote)
          const { error } = await supabase
            .from("post_votes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId);
          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          // Different vote → switch
          const { error } = await supabase
            .from("post_votes")
            .update({ vote_type: voteType })
            .eq("post_id", postId)
            .eq("user_id", userId);
          if (error) throw error;
          return { action: "updated", voteType };
        }
      } else {
        const { error } = await supabase.from("post_votes").insert({
          post_id: postId,
          user_id: userId,
          vote_type: voteType,
        });
        if (error) throw error;
        return { action: "created", voteType };
      }
    },

    onMutate: async ({ postId, userId, voteType }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      await queryClient.cancelQueries({ queryKey: ["post", postId] });

      const prevPosts = queryClient.getQueryData(["posts"]);
      const prevPost = queryClient.getQueryData(["post", postId]);
      const prevVote = queryClient.getQueryData([
        "post-vote",
        postId,
        userId,
      ]) as "up" | "down" | null;

      // Calculate vote delta
      let delta = 0;
      if (voteType === "up") {
        if (prevVote === "up")
          delta = -1; // removing upvote
        else if (prevVote === "down")
          delta = 2; // switching down → up
        else delta = 1; // new upvote
      } else {
        if (prevVote === "down")
          delta = 1; // removing downvote
        else if (prevVote === "up")
          delta = -2; // switching up → down
        else delta = -1; // new downvote
      }

      const newVote: "up" | "down" | null =
        prevVote === voteType ? null : voteType;

      // Update feed instantly
      queryClient.setQueryData(["posts"], (old: any) =>
        patchPost(old, postId, (post) => ({
          ...post,
          upvotes: post.upvotes + delta,
        })),
      );

      // Update detail page if open
      queryClient.setQueryData(["post", postId], (old: any) => {
        if (!old?.post) return old;
        return {
          ...old,
          post: { ...old.post, upvotes: old.post.upvotes + delta },
        };
      });

      // Update vote status immediately
      queryClient.setQueryData(["post-vote", postId, userId], newVote);

      return { prevPosts, prevPost, prevVote };
    },

    onError: (_err, variables, context) => {
      if (context?.prevPosts !== undefined) {
        queryClient.setQueryData(["posts"], context.prevPosts);
      }
      if (context?.prevPost !== undefined) {
        queryClient.setQueryData(["post", variables.postId], context.prevPost);
      }
      if (context?.prevVote !== undefined) {
        queryClient.setQueryData(
          ["post-vote", variables.postId, variables.userId],
          context.prevVote,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      // Sync with server quietly in the background
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      queryClient.invalidateQueries({
        queryKey: ["post-vote", variables.postId, variables.userId],
      });
    },
  });
}

// Award a post — optimistic
export function usePostAward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
      remove = false,
    }: {
      postId: string;
      userId: string;
      remove?: boolean;
    }) => {
      if (remove) {
        const { error } = await supabase
          .from("post_awards")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);
        if (error) throw error;
        return { action: "removed" };
      } else {
        const { error } = await supabase
          .from("post_awards")
          .insert({ post_id: postId, user_id: userId });
        if (error) throw error;
        return { action: "created" };
      }
    },

    onMutate: async ({ postId, userId, remove }) => {
      await queryClient.cancelQueries({
        queryKey: ["post-award", postId, userId],
      });
      const previousAward = queryClient.getQueryData([
        "post-award",
        postId,
        userId,
      ]);
      queryClient.setQueryData(["post-award", postId, userId], !remove);
      return { previousAward };
    },

    onError: (_err, variables, context) => {
      if (context?.previousAward !== undefined) {
        queryClient.setQueryData(
          ["post-award", variables.postId, variables.userId],
          context.previousAward,
        );
      }
    },

    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["post-award", variables.postId, variables.userId],
      });
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      title,
      description,
      imageUri,
    }: {
      groupId: string;
      userId: string;
      title: string;
      description?: string;
      imageUri?: string;
    }) => {
      let storagePath: string | null = null;
      if (imageUri) {
        storagePath = await uploadImage(imageUri);
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          group_id: groupId,
          user_id: userId,
          title,
          description: description || null,
          image_url: storagePath,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Real-time subscription handles this, but invalidate as a safety net
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
    }: {
      postId: string;
      userId: string;
    }) => {
      const { data: post, error: checkError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (checkError || !post || post.user_id !== userId) {
        throw new Error("You don't have permission to delete this post");
      }

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    },

    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const prevPosts = queryClient.getQueryData(["posts"]);
      // Remove from feed immediately
      queryClient.setQueryData(["posts"], (old: any) =>
        removePost(old, postId),
      );
      return { prevPosts };
    },

    onError: (_err, _vars, context) => {
      if (context?.prevPosts !== undefined) {
        queryClient.setQueryData(["posts"], context.prevPosts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useCreatePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      groupId,
      userId,
      question,
      options,
      durationHours,
    }: {
      groupId: string;
      userId: string;
      question: string;
      options: { text: string; imageUri?: string }[];
      durationHours: number;
    }) => {
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({ group_id: groupId, user_id: userId, title: question })
        .select()
        .single();
      if (postError) throw postError;

      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + durationHours);

      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({
          post_id: post.id,
          question,
          duration: `${durationHours}h`,
          ends_at: endsAt.toISOString(),
        })
        .select()
        .single();
      if (pollError) throw pollError;

      const optionsWithImages = await Promise.all(
        options.map(async (opt) => {
          let imagePath: string | null = null;
          if (opt.imageUri) {
            try {
              imagePath = await uploadImage(opt.imageUri);
            } catch {}
          }
          return { poll_id: poll.id, text: opt.text, image_url: imagePath };
        }),
      );

      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(optionsWithImages);
      if (optionsError) throw optionsError;

      return { post, poll };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function useDeletePoll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      userId,
    }: {
      postId: string;
      userId: string;
    }) => {
      const { data: post, error: checkError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (checkError || !post || post.user_id !== userId) {
        throw new Error("You don't have permission to delete this poll");
      }

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId);

      if (error) throw error;
      return { success: true };
    },

    onMutate: async ({ postId }) => {
      await queryClient.cancelQueries({ queryKey: ["posts"] });
      const prevPosts = queryClient.getQueryData(["posts"]);
      queryClient.setQueryData(["posts"], (old: any) =>
        removePost(old, postId),
      );
      return { prevPosts };
    },

    onError: (_err, _vars, context) => {
      if (context?.prevPosts !== undefined) {
        queryClient.setQueryData(["posts"], context.prevPosts);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

export function usePostShare() {
  return useMutation({
    mutationFn: async ({
      postId,
      postTitle,
    }: {
      postId: string;
      postTitle: string;
    }) => {
      const shareUrl = `https://yourapp.com/post/${postId}`;
      const shareMessage = `Check out this post: ${postTitle}\n\n${shareUrl}`;
      try {
        const result = await Share.share({
          message: shareMessage,
          url: shareUrl,
          title: postTitle,
        });
        if (result.action === Share.sharedAction) {
          return { success: true, method: "shared" };
        }
        return { success: false, method: "dismissed" };
      } catch {
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert("Link Copied!", "Post link copied to clipboard");
        return { success: true, method: "copied" };
      }
    },
  });
}
