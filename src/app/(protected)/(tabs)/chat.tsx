import groupMembers from "@/assets/data/groupMembers.json";
import messages from "@/assets/data/groupMessage.json";
import posts from "@/assets/data/posts.json";
import { COLORS } from "@/src/colors";
import GroupListItem from "@/src/components/GroupListItem";
import { Group } from "@/src/types";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21"; // TODO: Get from Clerk

export default function ChatGroupsList() {
  const router = useRouter();

  // Get groups user is a member of
  const userGroups = useMemo(() => {
    const memberGroups = groupMembers
      .filter((m) => m.user_id === CURRENT_USER_ID)
      .map((m) => m.group_id);

    // Get unique groups from posts
    const uniqueGroups = new Map<string, Group>();
    posts.forEach((post) => {
      if (memberGroups.includes(post.group.id)) {
        uniqueGroups.set(post.group.id, post.group);
      }
    });

    return Array.from(uniqueGroups.values());
  }, []);

  // Get last message and unread count for each group
  const getGroupData = (groupId: string) => {
    const groupMessages = messages.filter((m) => m.group_id === groupId);

    if (groupMessages.length === 0) {
      return { lastMessage: undefined, unreadCount: 0 };
    }

    // Sort by timestamp, most recent first
    const sorted = [...groupMessages].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const lastMessage = {
      text: sorted[0].message,
      timestamp: sorted[0].created_at,
      sender: sorted[0].user.name,
    };

    // Mock unread count
    const unreadCount = Math.floor(Math.random() * 5);

    return { lastMessage, unreadCount };
  };

  const handleGroupPress = (group: Group) => {
    router.push({
      pathname: "/groupChat/[id]",
      params: { id: group.id, name: group.name },
    });
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Feather name="message-circle" size={64} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No Group Chats Yet</Text>
      <Text style={styles.emptySubtitle}>
        Join communities to start chatting with members
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={userGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const { lastMessage, unreadCount } = getGroupData(item.id);
          return (
            <GroupListItem
              group={item}
              lastMessage={lastMessage}
              unreadCount={unreadCount}
              onPress={() => handleGroupPress(item)}
            />
          );
        }}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={userGroups.length === 0 && { flex: 1 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
