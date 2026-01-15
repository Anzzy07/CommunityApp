import groupMembers from "@/assets/data/groupMembers.json";
import groups from "@/assets/data/groups.json";
import posts from "@/assets/data/posts.json";
import { chatGroupAtom } from "@/src/atoms/ChatGroupAtom";
import { COLORS } from "@/src/colors";
import PostListItem from "@/src/components/PostListItem";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useMemo } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21";

export default function CommunityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const setChatGroup = useSetAtom(chatGroupAtom);

  // find current group
  const group = groups.find((g) => g.id === id);

  // check if user has joined this community
  const isJoined = groupMembers.some(
    (m) => m.group_id === id && m.user_id === CURRENT_USER_ID
  );

  // get posts belonging to this community
  const groupPosts = useMemo(
    () => posts.filter((p) => p.group.id === id),
    [id]
  );

  if (!group) {
    return <Text>Community not found</Text>;
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F3F4F6" }}
      edges={["bottom"]}
    >
      <FlatList
        data={groupPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostListItem post={item} />}
        ListHeaderComponent={
          <>
            {/* COMMUNITY HEADER */}
            <View
              style={{
                backgroundColor: "white",
                padding: 15,
                borderBottomWidth: 0.5,
                borderColor: "#E5E7EB",
              }}
            >
              {/* TOP ROW */}
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Image
                  source={{ uri: group.image }}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    marginRight: 10,
                  }}
                />

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                    r/{group.name}
                  </Text>
                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    {isJoined ? "You are a member" : "Join to post & chat"}
                  </Text>
                </View>

                {/* JOIN / JOINED */}
                <Pressable
                  style={{
                    backgroundColor: isJoined ? "#E5E7EB" : COLORS.button,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 20,
                  }}
                >
                  <Text
                    style={{
                      color: isJoined ? "#374151" : "white",
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {isJoined ? "Joined" : "Join"}
                  </Text>
                </Pressable>
              </View>

              {/* ACTION ROW */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 14,
                  gap: 12,
                }}
              >
                {/* CREATE POST */}
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/create",
                      params: { groupId: group.id },
                    })
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: "#F3F4F6",
                  }}
                >
                  <AntDesign name="plus-circle" size={14} />
                  <Text style={{ fontSize: 13, fontWeight: "500" }}>Post</Text>
                </Pressable>

                {/* CHAT */}
                <Pressable
                  onPress={() => {
                    // set the active chat community
                    setChatGroup(group);

                    // navigate to Chat TAB
                    router.push("/chat");
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: "#F3F4F6",
                  }}
                >
                  <MaterialCommunityIcons name="chat-outline" size={14} />
                  <Text style={{ fontSize: 13, fontWeight: "500" }}>Chat</Text>
                </Pressable>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <Text
            style={{
              textAlign: "center",
              marginTop: 40,
              color: "#6B7280",
            }}
          >
            No posts yet. Be the first to post.
          </Text>
        }
      />
    </SafeAreaView>
  );
}
