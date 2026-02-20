import posts from "@/assets/data/posts.json";
import { COLORS } from "@/src/colors";
import PostListItem from "@/src/components/PostListItem";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  // Track refresh state
  const [refreshing, setRefreshing] = useState(false);

  // Mock posts data
  const [postsList, setPostsList] = useState(posts);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);

    // Simulate API call
    setTimeout(() => {
      // Need to fetch new posts from Supabase after backend
      console.log("Refreshing posts...");
      setRefreshing(false);
    }, 1500);
  }, []);

  //  Render individual post item

  const renderPost = ({ item }: { item: (typeof posts)[0] }) => (
    <PostListItem post={item} />
  );

  // Render empty state when no posts

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
        // Pull to refresh
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        // Empty state
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
