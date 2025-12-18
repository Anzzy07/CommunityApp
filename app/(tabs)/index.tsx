import { formatDistanceToNowStrict } from "date-fns";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

import posts from "@/assets/data/posts.json";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
      <Text style={styles.title}>{post.title}</Text>
      <Image source={{ uri: post.image }} style={styles.image} />
      <Text numberOfLines={4}>{post.description}</Text>

      {/* Post Footer */}
      <View style={{ flexDirection: "row" }}>
        <MaterialCommunityIcons
          name="arrow-up-bold-outline"
          size={19}
          color="black"
        />
        <Text></Text>
        <MaterialCommunityIcons
          name="arrow-down-bold-outline"
          size={19}
          color="black"
        />
        <MaterialCommunityIcons
          name="comment-outline"
          size={19}
          color="black"
        />
        <MaterialCommunityIcons name="trophy-outline" size={19} color="black" />
        <MaterialCommunityIcons name="share-outline" size={19} color="black" />
      </View>
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
  image: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 15,
  },
  title: {
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 0.5,
  },
});
