import posts from "@/assets/data/posts.json";
import PostListItem from "@/src/components/PostListItem";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function DetailedPost() {
  const { id } = useLocalSearchParams();

  const detailedPost = posts.find((post) => post.id === id);

  if (!detailedPost) {
    return <Text>Post not found</Text>;
  }
  return (
    <View>
      <PostListItem post={detailedPost} isDetailedPost />
    </View>
  );
}
