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
  const { userId } = useLocalSearchParams<{ userId?: string }>();
  const { user } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TabType>("posts");

  // Determine if viewing own profile or another user's
  const isOwnProfile = !userId || userId === user?.id;
  const profileUserId = userId || user?.id;

  // Mock data - replace with actual data from Supabase later
  const userPosts = posts.filter((post) => post.user.id === profileUserId);
  const userStreak = userStreaks.find((s) => s.user_id === profileUserId);

  // Mock joined communities
  const joinedCommunities = [
    ...new Set(userPosts.map((post) => post.group)),
  ].slice(0, 6);

  // Calculate stats
  const totalPosts = userPosts.length;
  const totalUpvotes = userPosts.reduce((sum, post) => sum + post.upvotes, 0);

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
    console.log("Edit profile");
    // TODO: Navigate to edit profile screen
    // router.push("/editProfile");
  };

  // Get data based on active tab
  const getTabData = (): Post[] => {
    switch (activeTab) {
      case "posts":
        return userPosts;
      case "comments":
        return []; // TODO: Implement comments data
      case "communities":
        return []; // Communities use custom grid, not FlatList
      default:
        return [];
    }
  };

  // Render header component for FlatList
  const renderListHeader = () => (
    <>
      <ProfileHeader
        user={user}
        userStreak={userStreak}
        totalPosts={totalPosts}
        totalUpvotes={totalUpvotes}
        communitiesCount={joinedCommunities.length}
        isOwnProfile={isOwnProfile}
        onEditProfile={handleEditProfile}
      />
      <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );

  // Render footer for communities tab
  const renderListFooter = () => {
    if (activeTab === "communities") {
      return <CommunitiesGrid communities={joinedCommunities} />;
    }
    return null;
  };

  // Render empty state
  const renderEmptyComponent = () => {
    if (activeTab === "communities") {
      return null; // Communities grid handles its own empty state
    }

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

  // Render post item
  const renderPostItem = ({ item }: { item: Post }) => (
    <PostListItem post={item} showJoinButton={false} />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
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

      {/* Main Content - FlatList */}
      <FlatList
        data={getTabData()}
        keyExtractor={(item) => item.id}
        renderItem={renderPostItem}
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
