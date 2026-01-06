import comments from "@/assets/data/comments.json";
import posts from "@/assets/data/posts.json";
import CommentListItem from "@/src/components/CommentListItem";
import PostListItem from "@/src/components/PostListItem";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DetailedPost() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [comment, setComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const inputRef = useRef<TextInput | null>(null);

  const detailedPost = posts.find((post) => post.id === id);
  const postComments = comments.filter((c) => c.post_id === detailedPost?.id);

  if (!detailedPost) {
    return <Text>Post Not Found!</Text>;
  }

  // useCallback with memo inside CommentListItem prevents re-renders when replying to a comment
  const handleReplyPress = useCallback(
    (commentId: string, username: string) => {
      setReplyingTo(username);
      inputRef.current?.focus();
    },
    []
  );

  const handleSend = () => {
    console.log("Send:", comment);
    setComment("");
    setReplyingTo(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={insets.top + 10}
    >
      <FlatList
        ListHeaderComponent={
          <PostListItem post={detailedPost} isDetailedPost />
        }
        data={postComments}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CommentListItem
            comment={item}
            depth={0}
            handleReplyPress={handleReplyPress}
          />
        )}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* COMMENT INPUT */}
      <View
        style={{
          paddingBottom: insets.bottom,
          padding: 10,
          backgroundColor: "white",
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
        }}
      >
        {replyingTo && (
          <Text
            style={{
              fontSize: 12,
              color: "#737373",
              marginBottom: 4,
            }}
          >
            Replying to @{replyingTo}
          </Text>
        )}

        <TextInput
          ref={inputRef}
          placeholder="Join the conversation"
          value={comment}
          onChangeText={setComment}
          multiline
          style={{
            backgroundColor: "#F3F4F6",
            padding: 8,
            borderRadius: 8,
            minHeight: 40,
          }}
          onFocus={() => setIsInputFocused(true)}
          onBlur={() => setIsInputFocused(false)}
        />

        {isInputFocused && (
          <Pressable
            disabled={!comment.trim()}
            onPress={handleSend}
            style={{
              backgroundColor: comment.trim() ? "#2563EB" : "#D1D5DB",
              alignSelf: "flex-end",
              marginTop: 8,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                color: "white",
                paddingVertical: 6,
                paddingHorizontal: 14,
                fontWeight: "600",
                fontSize: 13,
              }}
            >
              Reply
            </Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
