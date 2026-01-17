import groupMembers from "@/assets/data/groupMembers.json";
import groups from "@/assets/data/groups.json";
import posts from "@/assets/data/posts.json";
import { challengesAtom } from "@/src/atoms/ChallangesAtom";
import { chatGroupAtom } from "@/src/atoms/ChatGroupAtom";
import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { COLORS } from "@/src/colors";
import ChallengeListItem from "@/src/components/ChallengeListItem";
import PostListItem from "@/src/components/PostListItem";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useMemo } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21";

export default function CommunityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challenges = useAtomValue(challengesAtom);

  const setChatGroup = useSetAtom(chatGroupAtom);
  const setGroupMembers = useSetAtom(groupMembersAtom);

  // challenges of community
  const groupChallenges = useMemo(
    () => challenges.filter((c) => c.group_id === id),
    [challenges, id]
  );

  // find current group
  const group = groups.find((g) => g.id === id);

  // check if user has joined this community
  const isJoined = groupMembers.some(
    (m) => m.group_id === id && m.user_id === CURRENT_USER_ID
  );

  // check if current user is the community leader
  const isLeader = group?.leader_id === CURRENT_USER_ID;

  // get posts belonging to this community
  const groupPosts = useMemo(
    () => posts.filter((p) => p.group.id === id),
    [id]
  );

  // leave community for members
  const handleLeave = () => {
    setGroupMembers((prev) =>
      prev.filter(
        (m) => !(m.group_id === group?.id && m.user_id === CURRENT_USER_ID)
      )
    );
  };

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
        renderItem={({ item }) => (
          <PostListItem post={item} showJoinButton={false} />
        )}
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
                  {/* COMMUNITY NAME & LEADER BADGE */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                      {group.name}
                    </Text>

                    {isLeader && (
                      <MaterialCommunityIcons
                        name="crown"
                        size={16}
                        color="#F59E0B"
                      />
                    )}
                  </View>

                  <Text style={{ fontSize: 13, color: "#6B7280" }}>
                    {isJoined
                      ? isLeader
                        ? "You are the community leader"
                        : "You are a member"
                      : "Join to post & chat"}
                  </Text>
                </View>

                {/* Join / Leave */}
                {isJoined && !isLeader ? (
                  <Pressable
                    onPress={handleLeave}
                    style={{
                      backgroundColor: "#FEE2E2",
                      paddingHorizontal: 14,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}
                  >
                    <Text
                      style={{
                        color: "#991B1B",
                        fontWeight: "600",
                        fontSize: 13,
                      }}
                    >
                      Leave
                    </Text>
                  </Pressable>
                ) : (
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
                )}
              </View>

              {/* ACTION ROW */}
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 14,
                  gap: 12,
                  flexWrap: "wrap",
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

                {/* CREATE CHALLENGE (LEADER ONLY) */}
                {isLeader && (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/createChallenge",
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
                      backgroundColor: "#E0F2FE",
                    }}
                  >
                    <MaterialCommunityIcons
                      name="trophy-outline"
                      size={14}
                      color="#0369A1"
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: "#0369A1",
                      }}
                    >
                      Challenge
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
            {/* CHALLENGES */}
            {groupChallenges.length > 0 && (
              <>
                <Text
                  style={{
                    marginTop: 16,
                    marginLeft: 15,
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#475569",
                  }}
                >
                  Active Challenges
                </Text>

                {groupChallenges.map((challenge) => (
                  <ChallengeListItem key={challenge.id} challenge={challenge} />
                ))}
              </>
            )}
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
