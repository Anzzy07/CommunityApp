import React from "react";

import posts from "@/assets/data/posts.json";
import { FlatList, View } from "react-native";
import PostListItem from "../components/PostListItem";

export default function HomeScreen() {
  return (
    <View>
      <FlatList
        data={posts}
        renderItem={({ item }) => <PostListItem post={item} />}
      />
    </View>
  );
}
