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
  // userId param is present when viewing someone else's profile
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Active tab controls which data is shown in the FlatList
  const [activeTab, setActiveTab] = useState<TabType>("posts");

  // Determine if this is the current user's own profile or another user's
  const isOwnProfile = !userId || userId === user?.id;
  const profileUserId = userId || user?.id || "";

  // Fetch all profile data from Supabase using React Query
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

  // Memoised tab data — only recalculates when the tab or underlying data changes.
  // Avoids creating a new array reference on every render which would cause FlatList flicker.
  const tabData = useMemo((): (Post | Comment)[] => {
    switch (activeTab) {
      case "posts":
        return userPosts;
      case "comments":
        return userComments;
      case "communities":
        return []; // Communities are shown in the footer, not the list
      default:
        return [];
    }
  }, [activeTab, userPosts, userComments]);

  // Shows a sign out confirmation alert then clears the session
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

  // Navigates to the edit profile screen
  const handleEditProfile = useCallback(() => {
    router.push("/editProfile");
  }, [router]);

  // Renders the profile header and tab selector above the list
  // useCallback prevents this from recreating on every render
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

  // Renders the communities grid below the list when communities tab is active
  const renderListFooter = useCallback(() => {
    if (activeTab === "communities") {
      return <CommunitiesGrid communities={joinedCommunities.slice(0, 6)} />;
    }
    return null;
  }, [activeTab, joinedCommunities]);

  // Renders the empty state for posts and comments tabs
  const renderEmptyComponent = useCallback(() => {
    // Communities tab uses the footer grid instead of an empty message
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

  // Renders either a PostListItem or CommentListItemSimple based on item type.
  // "title" in item is a quick way to distinguish Post from Comment at runtime.
  const renderItem = useCallback(({ item }: { item: Post | Comment }) => {
    if ("title" in item) {
      // Item is a Post — show full post card without join button
      return <PostListItem post={item as Post} showJoinButton={false} />;
    }
    // Item is a Comment — show simplified comment card that links to the post
    return <CommentListItemSimple comment={item as Comment} />;
  }, []);

  // Stable key extractor — uses item id for both Post and Comment
  const keyExtractor = useCallback((item: Post | Comment) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top navigation header with back button and sign out */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="left" size={24} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Profile</Text>

        {/* Sign out button only shown on own profile */}
        {isOwnProfile && (
          <Pressable onPress={handleSignOut} hitSlop={10}>
            <Feather name="log-out" size={22} color="white" />
          </Pressable>
        )}

        {/* Spacer to keep title centred on other users' profiles */}
        {!isOwnProfile && <View style={{ width: 22 }} />}
      </View>

      {/* Main scrollable list — header contains profile info and tabs,
          footer contains the communities grid when that tab is active */}
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
