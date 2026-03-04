import { supabase } from "@/src/lib/supabase";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { Alert, Share } from "react-native";

// Vote on a post (upvote or downvote)
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
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from("post_votes")
        .select("*")
        .eq("post_id", postId)
        .eq("user_id", userId)
        .single();

      if (existingVote) {
        // If same vote type, remove it (un-vote)
        if (existingVote.vote_type === voteType) {
          const { error } = await supabase
            .from("post_votes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "removed", voteType: null };
        } else {
          // If different vote type, update it
          const { error } = await supabase
            .from("post_votes")
            .update({ vote_type: voteType })
            .eq("post_id", postId)
            .eq("user_id", userId);

          if (error) throw error;
          return { action: "updated", voteType };
        }
      } else {
        // No existing vote, create new one
        const { error } = await supabase.from("post_votes").insert({
          post_id: postId,
          user_id: userId,
          vote_type: voteType,
        });

        if (error) throw error;
        return { action: "created", voteType };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both posts list and post details
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

// Give or remove award from a post
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
        // Remove award
        const { error } = await supabase
          .from("post_awards")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", userId);

        if (error) throw error;
        return { action: "removed" };
      } else {
        // Give award
        const { error } = await supabase.from("post_awards").insert({
          post_id: postId,
          user_id: userId,
        });

        if (error) throw error;
        return { action: "created" };
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate both posts list and post details
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

// Share post with native share or copy link
export function usePostShare() {
  return useMutation({
    mutationFn: async ({
      postId,
      postTitle,
    }: {
      postId: string;
      postTitle: string;
    }) => {
      // Create shareable link (adjust domain to your app's domain)
      const shareUrl = `https://yourapp.com/post/${postId}`;
      const shareMessage = `Check out this post: ${postTitle}\n\n${shareUrl}`;

      try {
        // Try native share first
        const result = await Share.share({
          message: shareMessage,
          url: shareUrl, // iOS will use this
          title: postTitle,
        });

        if (result.action === Share.sharedAction) {
          return { success: true, method: "shared" };
        } else if (result.action === Share.dismissedAction) {
          return { success: false, method: "dismissed" };
        }
      } catch (error: any) {
        // If share fails (Android doesn't support url prop), copy to clipboard
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert("Link Copied!", "Post link copied to clipboard");
        return { success: true, method: "copied" };
      }

      return { success: false };
    },
  });
}
