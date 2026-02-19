import posts from "@/assets/data/posts.json";
import userStreaks from "@/assets/data/userStreaks.json";
import { COLORS } from "@/src/colors";
import PostListItem from "@/src/components/PostListItem";
import CommunitiesGrid from "@/src/components/profile/CommunityGrid";
import ProfileHeader from "@/src/components/profile/ProfileHeader";
import ProfileTabs, { TabType } from "@/src/components/profile/ProfileTabs";
import { Post } from "@/src/types";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ProfileScreen() {
  // Get userId from URL params - if viewing another user's profile
  const { userId } = useLocalSearchParams<{ userId?: string }>();

  // Get current logged-in user from Clerk
  const { user } = useUser();

  // Get sign out function from Clerk
  const { signOut } = useAuth();

  // Navigation router
  const router = useRouter();

  // Safe area insets for notch/status bar handling
  const insets = useSafeAreaInsets();

  // Track which tab is currently active (posts/comments/communities)
  const [activeTab, setActiveTab] = useState<TabType>("posts");

  // Determine if viewing own profile or another user's
  // If no userId param, it's own profile
  const isOwnProfile = !userId || userId === user?.id;

  // Get the profile user ID (own or other user)
  const profileUserId = userId || user?.id;

  // Filter posts to show only posts by this user
  const userPosts = posts.filter((post) => post.user.id === profileUserId);

  // Find this user's streak data
  const userStreak = userStreaks.find((s) => s.user_id === profileUserId);

  // Get unique communities this user has posted in
  const joinedCommunities = [
    ...new Set(userPosts.map((post) => post.group)),
  ].slice(0, 6); // Limit to 6 communities

  // Calculate total posts count
  const totalPosts = userPosts.length;

  // Calculate total upvotes across all user's posts
  const totalUpvotes = userPosts.reduce((sum, post) => sum + post.upvotes, 0);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut(); // Sign out from Clerk
          router.replace("/signIn"); // Navigate to sign in screen
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    router.push("/editProfile"); // Navigate to Edit Profile screen
  };

  const getTabData = (): Post[] => {
    switch (activeTab) {
      case "posts":
        return userPosts; // Show user's posts
      case "comments":
        return []; // Implementing comments data
      case "communities":
        return []; // Communities use custom grid component
      default:
        return [];
    }
  };

  const renderListHeader = () => (
    <>
      {/* Profile information section */}
      <ProfileHeader
        user={user}
        userStreak={userStreak}
        totalPosts={totalPosts}
        totalUpvotes={totalUpvotes}
        communitiesCount={joinedCommunities.length}
        isOwnProfile={isOwnProfile}
        onEditProfile={handleEditProfile}
      />
      {/* Tab navigation (Posts/Comments/Communities) */}
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );

  const renderListFooter = () => {
    if (activeTab === "communities") {
      return <CommunitiesGrid communities={joinedCommunities} />;
    }
    return null;
  };

  const renderEmptyComponent = () => {
    // Communities tab has its own empty state in the grid
    if (activeTab === "communities") {
      return null;
    }

    // Set icon and text based on tab
    let icon: "post-outline" | "comment-outline" = "post-outline";
    let text = "No posts yet";

    if (activeTab === "comments") {
      icon = "comment-outline";
      text = "Comments will appear here";
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

  const renderPostItem = ({ item }: { item: Post }) => (
    <PostListItem post={item} showJoinButton={false} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header with back button and sign out */}
      <View style={styles.header}>
        {/* Back button */}
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="left" size={24} color="white" />
        </Pressable>

        {/* Title */}
        <Text style={styles.headerTitle}>Profile</Text>

        {/* Sign out button only for users own profile */}
        {isOwnProfile && (
          <Pressable onPress={handleSignOut} hitSlop={10}>
            <Feather name="log-out" size={22} color="white" />
          </Pressable>
        )}

        {/* Spacer for alignment when viewing other profiles */}
        {!isOwnProfile && <View style={{ width: 22 }} />}
      </View>

      {/* Uses FlatList for scrolling */}
      <FlatList
        data={getTabData()} // Posts or empty array based on tab
        keyExtractor={(item) => item.id} // Unique key for each item
        renderItem={renderPostItem} // How to render each post
        ListHeaderComponent={renderListHeader} // Profile info + tabs at top
        ListFooterComponent={renderListFooter} // Communities grid at bottom (if active)
        ListEmptyComponent={renderEmptyComponent} // Empty state when no data
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false} // Hide scroll indicator
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
