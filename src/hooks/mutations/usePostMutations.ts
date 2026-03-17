import { supabase } from "@/src/lib/supabase";
import { uploadImage } from "@/src/utils/supabaseImages";
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
    onSuccess: async (_, variables) => {
      // Refetch queries to get updated vote count from database
      await queryClient.refetchQueries({ queryKey: ["posts"] });
      await queryClient.refetchQueries({
        queryKey: ["post", variables.postId],
      });
      await queryClient.refetchQueries({
        queryKey: ["post-vote", variables.postId, variables.userId],
      });
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
    onMutate: async ({ postId, userId, remove }) => {
      // Cancel outgoing queries to avoid race conditions
      await queryClient.cancelQueries({
        queryKey: ["post-award", postId, userId],
      });

      // Snapshot previous value
      const previousAward = queryClient.getQueryData([
        "post-award",
        postId,
        userId,
      ]);

      // Optimistically update award status
      queryClient.setQueryData(["post-award", postId, userId], !remove);

      return { previousAward };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousAward !== undefined) {
        queryClient.setQueryData(
          ["post-award", variables.postId, variables.userId],
          context.previousAward,
        );
      }
    },
    onSettled: (_, __, variables) => {
      // Refetch to ensure sync with server
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
      console.log("📝 Creating post:", { groupId, userId, title, imageUri });

      // Upload image to Supabase Storage if provided
      let storagePath: string | null = null;
      if (imageUri) {
        try {
          console.log("📤 Uploading image to storage...");
          storagePath = await uploadImage(imageUri);
          console.log("✅ Image uploaded to:", storagePath);
        } catch (error) {
          console.error("❌ Error uploading image:", error);
          throw new Error("Failed to upload image");
        }
      }

      const { data, error } = await supabase
        .from("posts")
        .insert({
          group_id: groupId,
          user_id: userId,
          title,
          description: description || null,
          image_url: storagePath, // Use storage path instead of local URI
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating post:", error);
        throw error;
      }

      console.log("✅ Post created:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// Delete a post
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
      console.log("🗑️ Deleting post:", postId);

      // Verify ownership
      const { data: post, error: checkError } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();

      if (checkError || !post || post.user_id !== userId) {
        throw new Error("You don't have permission to delete this post");
      }

      // Delete the post
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Error deleting post:", error);
        throw error;
      }

      console.log("✅ Post deleted");
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });
}

// Update a post
// export function useUpdatePost() {
//   const queryClient = useQueryClient();

//   return useMutation({
//     mutationFn: async ({
//       postId,
//       userId,
//       title,
//       description,
//       imageUri,
//     }: {
//       postId: string;
//       userId: string;
//       title: string;
//       description?: string;
//       imageUri?: string;
//     }) => {
//       console.log("📝 Updating post:", postId);

//       // Verify ownership
//       const { data: post, error: checkError } = await supabase
//         .from("posts")
//         .select("user_id")
//         .eq("id", postId)
//         .single();

//       if (checkError || !post || post.user_id !== userId) {
//         throw new Error("You don't have permission to edit this post");
//       }

//       // Upload image if provided
//       let storagePath: string | null = null;
//       if (imageUri) {
//         try {
//           console.log("📤 Uploading image to storage...");
//           storagePath = await uploadImage(imageUri);
//           console.log("✅ Image uploaded to:", storagePath);
//         } catch (error) {
//           console.error("❌ Error uploading image:", error);
//           throw new Error("Failed to upload image");
//         }
//       }

//       const { data, error } = await supabase
//         .from("posts")
//         .update({
//           title,
//           description: description || null,
//           image_url: storagePath,
//         })
//         .eq("id", postId)
//         .eq("user_id", userId)
//         .select()
//         .single();

//       if (error) {
//         console.error("❌ Error updating post:", error);
//         throw error;
//       }

//       console.log("✅ Post updated");
//       return data;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["posts"] });
//     },
//   });
// }

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
      options: { text: string; imageUri?: string }[]; // Changed to imageUri
      durationHours: number;
    }) => {
      console.log("📊 Creating poll:", { groupId, userId, question });

      // Create the post first
      const { data: post, error: postError } = await supabase
        .from("posts")
        .insert({
          group_id: groupId,
          user_id: userId,
          title: question,
        })
        .select()
        .single();

      if (postError) {
        console.error("❌ Error creating poll post:", postError);
        throw postError;
      }

      // Calculate end date
      const endsAt = new Date();
      endsAt.setHours(endsAt.getHours() + durationHours);

      // Create the poll
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

      if (pollError) {
        console.error("❌ Error creating poll:", pollError);
        throw pollError;
      }

      // Upload images for poll options if they have images
      const optionsWithImages = await Promise.all(
        options.map(async (opt) => {
          let imagePath: string | undefined;
          if (opt.imageUri) {
            try {
              imagePath = await uploadImage(opt.imageUri);
            } catch (error) {
              console.error("❌ Poll option image upload failed:", error);
            }
          }
          return {
            poll_id: poll.id,
            text: opt.text,
            image_url: imagePath || null,
          };
        }),
      );

      // Create poll options
      const { error: optionsError } = await supabase
        .from("poll_options")
        .insert(optionsWithImages);

      if (optionsError) {
        console.error("❌ Error creating poll options:", optionsError);
        throw optionsError;
      }

      console.log("✅ Poll created with options");
      return { post, poll };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
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
      // Create shareable link
      const shareUrl = `https://yourapp.com/post/${postId}`;
      const shareMessage = `Check out this post: ${postTitle}\n\n${shareUrl}`;

      try {
        // Try native share first
        const result = await Share.share({
          message: shareMessage,
          url: shareUrl,
          title: postTitle,
        });

        if (result.action === Share.sharedAction) {
          return { success: true, method: "shared" };
        } else if (result.action === Share.dismissedAction) {
          return { success: false, method: "dismissed" };
        }
      } catch (error: any) {
        // If share fails, copy to clipboard
        await Clipboard.setStringAsync(shareUrl);
        Alert.alert("Link Copied!", "Post link copied to clipboard");
        return { success: true, method: "copied" };
      }

      return { success: false };
    },
  });
}
