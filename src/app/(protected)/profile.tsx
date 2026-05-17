import { COLORS } from "@/src/colors";
import PostListItem from "@/src/components/PostListItem";
import CommentListItemSimple from "@/src/components/profile/CommentListItemSimple";
import CommunitiesGrid from "@/src/components/profile/CommunityGrid";
import ProfileHeader from "@/src/components/profile/ProfileHeader";
import ProfileTabs, { TabType } from "@/src/components/profile/ProfileTabs";
import { useSupabaseUserComments } from "@/src/hooks/queries/useSupabaseUserComments";
import { useSupabaseUserCommunities } from "@/src/hooks/queries/useSupabaseUserCommunities";
import { useSupabaseUserPosts } from "@/src/hooks/queries/useSupabaseUserPosts";
import { useSupabaseUserStats } from "@/src/hooks/queries/useSupabaseUserStats";
import { useSupabaseUserStreaks } from "@/src/hooks/queries/useSupabaseUserStreaks";
import { Comment, Post } from "@/src/types";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  // userId is present when viewing another user's profile; absent for the current user's own
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Tracks which tab (posts / comments / communities) is currently selected
  const [activeTab, setActiveTab] = useState<TabType>("posts");

  const isOwnProfile = !userId || userId === user?.id;
  const profileUserId = userId || user?.id || "";

  // Fetch all profile data in parallel — React Query deduplicates and caches each request
  const { data: userPosts = [], isLoading: postsLoading } =
    useSupabaseUserPosts(profileUserId);
  const { data: userComments = [], isLoading: commentsLoading } =
    useSupabaseUserComments(profileUserId);
  const { data: userStats, isLoading: statsLoading } =
    useSupabaseUserStats(profileUserId);
  const { data: userStreak, isLoading: streakLoading } =
    useSupabaseUserStreaks(profileUserId);
  const { data: joinedCommunities = [], isLoading: communitiesLoading } =
    useSupabaseUserCommunities(profileUserId);

  const isLoading =
    postsLoading ||
    commentsLoading ||
    statsLoading ||
    streakLoading ||
    communitiesLoading;

  // Return the correct data array for the active tab.
  // Communities are rendered in the list footer, so this returns an empty array for that tab.
  const tabData = useMemo((): (Post | Comment)[] => {
    switch (activeTab) {
      case "posts":
        return userPosts;
      case "comments":
        return userComments;
      case "communities":
        return [];
      default:
        return [];
    }
  }, [activeTab, userPosts, userComments]);

  // Confirm sign-out before clearing the session and redirecting to the sign-in screen
  const handleSignOut = useCallback(() => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/signIn");
        },
      },
    ]);
  }, [signOut, router]);

  const handleEditProfile = useCallback(() => {
    router.push("/editProfile");
  }, [router]);

  // Renders the profile card and tab selector above the scrollable list.
  // Wrapped in useCallback to prevent unnecessary re-renders of the list header.
  const renderListHeader = useCallback(
    () => (
      <>
        <ProfileHeader
          user={user}
          userStreak={
            userStreak &&
            typeof userStreak === "object" &&
            "user_id" in userStreak
              ? userStreak
              : undefined
          }
          totalPosts={userStats?.totalPosts || 0}
          totalUpvotes={userStats?.totalUpvotes || 0}
          communitiesCount={joinedCommunities.length}
          isOwnProfile={isOwnProfile}
          onEditProfile={handleEditProfile}
        />
        <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </>
    ),
    [
      user,
      userStreak,
      userStats,
      joinedCommunities.length,
      isOwnProfile,
      handleEditProfile,
      activeTab,
    ],
  );

  // Renders the communities grid below the list when the communities tab is active.
  const renderListFooter = useCallback(() => {
    if (activeTab === "communities") {
      return <CommunitiesGrid communities={joinedCommunities.slice(0, 6)} />;
    }
    return null;
  }, [activeTab, joinedCommunities]);

  // Empty state for posts and comments tabs.
  const renderEmptyComponent = useCallback(() => {
    if (activeTab === "communities") return null;

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={activeTab === "comments" ? "comment-outline" : "post-outline"}
          size={48}
          color={COLORS.textSecondary}
        />
        <Text style={styles.emptyText}>
          {activeTab === "comments" ? "No comments yet" : "No posts yet"}
        </Text>
      </View>
    );
  }, [activeTab, isLoading]);

  // Distinguish between Post and Comment at runtime using the "title" property,
  // which only exists on Post objects
  const renderItem = useCallback(({ item }: { item: Post | Comment }) => {
    if ("title" in item) {
      return <PostListItem post={item as Post} showJoinButton={false} />;
    }
    return <CommentListItemSimple comment={item as Comment} />;
  }, []);

  const keyExtractor = useCallback((item: Post | Comment) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Navigation header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="left" size={24} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Profile</Text>

        {isOwnProfile && (
          <Pressable onPress={handleSignOut} hitSlop={10}>
            <Feather name="log-out" size={22} color="white" />
          </Pressable>
        )}

        {/* Placeholder keeps the title visually centred on other users' profiles */}
        {!isOwnProfile && <View style={{ width: 22 }} />}
      </View>

      {/* Single FlatList with a header (profile + tabs) */}
      <FlatList
        data={tabData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={8}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.headerMain,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
