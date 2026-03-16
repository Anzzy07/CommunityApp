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
import React, { useState } from "react";
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
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>("posts");

  const isOwnProfile = !userId || userId === user?.id;
  const profileUserId = userId || user?.id || "";

  // Fetch data from Supabase
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

  const handleSignOut = () => {
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
  };

  const handleEditProfile = () => {
    router.push("/editProfile");
  };

  const getTabData = (): (Post | Comment)[] => {
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
  };

  const renderListHeader = () => (
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
  );

  const renderListFooter = () => {
    if (activeTab === "communities") {
      return <CommunitiesGrid communities={joinedCommunities.slice(0, 6)} />;
    }
    return null;
  };

  const renderEmptyComponent = () => {
    if (activeTab === "communities") {
      return null;
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    let icon: "post-outline" | "comment-outline" = "post-outline";
    let text = "No posts yet";

    if (activeTab === "comments") {
      icon = "comment-outline";
      text = "No comments yet";
    }

    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons
          name={icon}
          size={48}
          color={COLORS.textSecondary}
        />
        <Text style={styles.emptyText}>{text}</Text>
      </View>
    );
  };

  const renderItem = ({ item }: { item: Post | Comment }) => {
    // Check if it's a Post or Comment
    if ("title" in item) {
      // if it's a Post then
      return <PostListItem post={item} showJoinButton={false} />;
    } else {
      // if it's a Comment then
      return <CommentListItemSimple comment={item} />;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
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

        {!isOwnProfile && <View style={{ width: 22 }} />}
      </View>

      <FlatList
        data={getTabData()}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
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
    fontSize: 20,
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
