import React from "react";

import posts from "@/assets/data/posts.json";
import PostListItem from "@/src/components/PostListItem";
import { FlatList, View } from "react-native";

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
