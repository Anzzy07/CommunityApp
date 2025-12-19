import React from "react";

import posts from "@/assets/data/posts.json";
import { View } from "react-native";
import PostListItem from "../components/Postlistitem";

export default function HomeScreen() {
  return (
    <View>
      <PostListItem post={posts[0]} />
      <PostListItem post={posts[1]} />
    </View>
  );
}
