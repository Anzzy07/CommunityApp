import { View, Text, Image, StyleSheet } from "react-native";
import React from "react";
import { formatDistanceToNowStrict } from "date-fns";

import posts from "../../../assets/data/posts.json";

export default function HomeScreen() {
  const post = posts[0];
  return (
    <View style={{ paddingHorizontal: 15, paddingVertical: 10 }}>
      {/* Post Header */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Image
          source={{ uri: post.group.image }}
          style={{ width: 20, height: 20, borderRadius: 15 }}
        />
        <Text style={{ fontWeight: "bold" }}>{post.group.name}</Text>
        <Text style={{ color: "grey" }}>
          {formatDistanceToNowStrict(new Date(post.created_at))}
        </Text>
        <View style={{ marginLeft: "auto" }}>
          <Text style={styles.joinButton}>Join</Text>
        </View>
      </View>

      {/* Content */}
      <Text>{post.title}</Text>
      <Image
        source={{ uri: post.image }}
        style={{ width: "100%", aspectRatio: 4 / 3, borderRadius: 15 }}
      />
      <Text>{post.description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  joinButton: {
    backgroundColor: "#0d469b",
    color: "white",
    paddingVertical: 2,
    paddingHorizontal: 7,
    borderRadius: 10,
    fontWeight: "bold",
  },
});
