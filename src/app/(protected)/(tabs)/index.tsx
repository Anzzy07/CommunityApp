import posts from "@/assets/data/posts.json";
import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { COLORS } from "@/src/colors";
import PostListItem from "@/src/components/PostListItem";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAtomValue } from "jotai";
import React, { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

const CURRENT_USER_ID = "user-21";

// Displaying all posts with pull-to-refresh
export default function HomeScreen() {
  const groupMembers = useAtomValue(groupMembersAtom);

  const [refreshing, setRefreshing] = useState(false);
  const [postsList, setPostsList] = useState(posts);

  // Checks if user is a member of the given community
  const isJoined = (groupId: string) => {
    return groupMembers.some(
      (m) => m.group_id === groupId && m.user_id === CURRENT_USER_ID,
    );
  };

  // Simulates fetching new posts from the server when user pulls to refresh
  const onRefresh = React.useCallback(() => {
    setRefreshing(true);

    setTimeout(() => {
      // Will be fetching new posts from Supabase
      console.log("Refreshing posts...");
      setRefreshing(false);
    }, 1500);
  }, []);

  // Renders individual post item with synced join status
  const renderPost = ({ item }: { item: (typeof posts)[0] }) => (
    <PostListItem post={item} isJoined={isJoined(item.group.id)} />
  );

  // Renders empty state when there are no posts
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="post-outline"
          size={64}
          color={COLORS.textSecondary}
        />
      </View>
      <Text style={styles.emptyTitle}>No Posts Yet</Text>
      <Text style={styles.emptySubtitle}>
        Join communities and start sharing!
      </Text>
    </View>
  );

  return (
    <View>
      <FlatList
        data={postsList}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 80,
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
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
