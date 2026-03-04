import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { COLORS } from "@/src/colors";
import PostListItem from "@/src/components/PostListItem";
import { useSupabasePosts } from "@/src/hooks/queries/useSupabasePosts";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAtomValue } from "jotai";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

// Main home feed screen displaying all posts with pull-to-refresh using React Query
export default function HomeScreen() {
  const { user } = useUser();
  const groupMembers = useAtomValue(groupMembersAtom);

  // Fetch posts from Supabase with React Query
  const {
    data: posts = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useSupabasePosts();

  // Checks if user is a member of the given community
  const isJoined = (groupId: string) => {
    if (!user?.id) return false;
    return groupMembers.some(
      (m) => m.group_id === groupId && m.user_id === user.id,
    );
  };

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

  // Shows loading spinner while fetching initial posts
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading posts...</Text>
      </View>
    );
  }

  // Shows error message if fetch failed
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={64}
          color={COLORS.error}
        />
        <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={renderPost}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: COLORS.background,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
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
