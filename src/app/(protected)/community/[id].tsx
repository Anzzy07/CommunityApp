import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import ChallengeListItem from "@/src/components/ChallengeListItem";
import PostListItem from "@/src/components/PostListItem";
import {
  useJoinGroup,
  useLeaveGroup,
} from "@/src/hooks/mutations/useGroupMutations";
import { useSupabaseChallenges } from "@/src/hooks/queries/useSupabaseChallenges";
import {
  useSupabaseGroupMemberCount,
  useSupabaseGroupMembers,
} from "@/src/hooks/queries/useSupabaseGroupMembers";
import {
  useSupabaseGroupPostCount,
  useSupabaseGroupPosts,
} from "@/src/hooks/queries/useSupabaseGroupPosts";
import { useSupabaseGroup } from "@/src/hooks/queries/useSupabaseGroups";
import { Post } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunityDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUser();
  const setSelectedGroup = useSetAtom(selectedGroupAtom);

  // Fetch only this community — replaces the old groups.find() pattern that
  // loaded every community in the app just to render one screen
  const {
    data: group,
    isLoading: groupLoading,
    refetch: refetchGroup,
  } = useSupabaseGroup(id);
  const {
    data: groupMembers = [],
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useSupabaseGroupMembers(user?.id || "");
  const { data: memberCount = 0 } = useSupabaseGroupMemberCount(id);
  const { data: challenges = [] } = useSupabaseChallenges(id);

  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();

  const isJoined = groupMembers.some((m) => m.group_id === id);
  const isLeader = group?.leader_id === user?.id;

  // Only fetch posts for members — saves a DB query for visitors
  const { data: groupPosts = [], refetch: refetchPosts } =
    useSupabaseGroupPosts(isJoined ? id : "");

  // Cheap count-only query for non-members to show community activity
  const { data: postCount = 0 } = useSupabaseGroupPostCount(
    !isJoined ? id : "",
  );

  const isLoading = groupLoading || membersLoading;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchGroup(), refetchMembers(), refetchPosts()]);
  }, [refetchGroup, refetchMembers, refetchPosts]);

  const handleJoin = async () => {
    if (!user?.id) {
      Alert.alert("Sign in required", "Please sign in to join communities");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await joinMutation.mutateAsync({ groupId: id, userId: user.id });
    } catch {
      Alert.alert("Error", "Failed to join community. Please try again.");
    }
  };

  const handleLeave = () => {
    if (!user?.id) return;
    if (isLeader) {
      Alert.alert(
        "Cannot Leave",
        "You're the leader of this community. Transfer leadership before leaving.",
      );
      return;
    }
    Alert.alert("Leave Community", "Are you sure you want to leave?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveMutation.mutateAsync({ groupId: id, userId: user.id });
          } catch {
            Alert.alert("Error", "Failed to leave community.");
          }
        },
      },
    ]);
  };

  const renderPost = useCallback(
    ({ item }: { item: Post }) => (
      <PostListItem post={item} showJoinButton={false} isJoined={isJoined} />
    ),
    [isJoined],
  );

  const keyExtractor = useCallback((item: Post) => item.id, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading community...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.notFound}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={COLORS.textSecondary}
        />
        <Text style={styles.notFoundText}>Community not found</Text>
      </View>
    );
  }

  const renderHeader = () => (
    <>
      {/* Hero: blurred cover with avatar, name and member count overlaid */}
      <View style={styles.heroSection}>
        <Image
          source={{ uri: group.image || "https://via.placeholder.com/80" }}
          style={styles.heroCover}
        />
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Image
            source={{ uri: group.image || "https://via.placeholder.com/400" }}
            style={styles.heroImage}
          />
          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.heroName}>{group.name}</Text>
              {isLeader && (
                <MaterialCommunityIcons
                  name="crown"
                  size={20}
                  color="#FCD34D"
                />
              )}
            </View>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons
                name="account-group"
                size={16}
                color="rgba(255,255,255,0.8)"
              />
              <Text style={styles.metaText}>
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action bar: members see Create/Chat/Challenge, visitors see Join */}
      <View style={styles.actionsContainer}>
        {isJoined ? (
          <>
            <Pressable
              style={[styles.actionButton, styles.primaryAction]}
              onPress={() => {
                setSelectedGroup({
                  id: group.id,
                  name: group.name,
                  image: group.image,
                  leader_id: group.leader_id,
                });
                router.push("/create");
              }}
            >
              <Feather name="edit-3" size={18} color="white" />
              <Text style={styles.primaryActionText}>Create Post</Text>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={() =>
                router.push({
                  pathname: "/groupChat/[id]",
                  params: { id: group.id, name: group.name },
                })
              }
            >
              <MaterialCommunityIcons
                name="chat-outline"
                size={20}
                color={COLORS.primary}
              />
              <Text style={styles.secondaryActionText}>Chat</Text>
            </Pressable>

            {/* Challenge creation is leader-only */}
            {isLeader && (
              <Pressable
                style={[styles.actionButton, styles.challengeAction]}
                onPress={() =>
                  router.push({
                    pathname: "/createChallenge",
                    params: { groupId: group.id },
                  })
                }
              >
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={20}
                  color="#0369A1"
                />
                <Text style={styles.challengeActionText}>Challenge</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Pressable
            style={[styles.actionButton, styles.joinAction]}
            onPress={handleJoin}
            disabled={joinMutation.isPending}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="account-plus"
                  size={20}
                  color="white"
                />
                <Text style={styles.joinActionText}>Join Community</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Leave button — regular members only, not the leader */}
        {isJoined && !isLeader && (
          <Pressable
            style={[styles.actionButton, styles.leaveAction]}
            onPress={handleLeave}
            disabled={leaveMutation.isPending}
          >
            {leaveMutation.isPending ? (
              <ActivityIndicator color="#DC2626" size="small" />
            ) : (
              <MaterialCommunityIcons
                name="exit-to-app"
                size={18}
                color="#DC2626"
              />
            )}
          </Pressable>
        )}
      </View>

      {/* Membership status strip */}
      {isJoined && (
        <View style={styles.statusBanner}>
          <MaterialCommunityIcons
            name={isLeader ? "crown" : "check-circle"}
            size={16}
            color={isLeader ? "#F59E0B" : COLORS.primary}
          />
          <Text
            style={[styles.statusText, isLeader && styles.leaderStatusText]}
          >
            {isLeader
              ? "You're the community leader"
              : "You're a member of this community"}
          </Text>
        </View>
      )}

      {/* Challenges — members only */}
      {isJoined && challenges.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons
              name="trophy"
              size={20}
              color={COLORS.primary}
            />
            <Text style={styles.sectionTitle}>Active Challenges</Text>
            <Text style={styles.challengeCount}>{challenges.length}</Text>
          </View>
          {challenges.map((challenge) => (
            <ChallengeListItem key={challenge.id} challenge={challenge} />
          ))}
        </>
      )}

      {/* Posts header — visitors see DB count so they know what they're missing */}
      <View style={styles.postsHeader}>
        <Text style={styles.postsTitle}>Community Posts</Text>
        <Text style={styles.postsCount}>
          {isJoined ? groupPosts.length : postCount}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={isJoined ? groupPosts : []}
        keyExtractor={keyExtractor}
        renderItem={renderPost}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isJoined ? (
            <View style={styles.emptyPosts}>
              <MaterialCommunityIcons
                name="post-outline"
                size={48}
                color={COLORS.textSecondary}
              />
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptySubtitle}>
                Be the first to share something!
              </Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        windowSize={8}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 15, color: COLORS.textSecondary },
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  notFoundText: { fontSize: 16, color: COLORS.textSecondary },
  heroSection: {
    height: 200,
    position: "relative",
    backgroundColor: COLORS.headerMain,
  },
  heroCover: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  heroContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: "white",
  },
  heroInfo: { flex: 1, marginLeft: 16, justifyContent: "flex-end" },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  heroName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "500" },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    paddingVertical: 16,
    backgroundColor: "white",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryAction: { flex: 1, backgroundColor: COLORS.primary },
  primaryActionText: { color: "white", fontWeight: "600", fontSize: 15 },
  secondaryAction: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  secondaryActionText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 15,
  },
  challengeAction: {
    paddingHorizontal: 14,
    backgroundColor: "#E0F2FE",
    borderWidth: 1.5,
    borderColor: "#0369A1",
  },
  challengeActionText: { color: "#0369A1", fontWeight: "600", fontSize: 14 },
  joinAction: { flex: 1, backgroundColor: COLORS.primary },
  joinActionText: { color: "white", fontWeight: "700", fontSize: 16 },
  leaveAction: { paddingHorizontal: 12, backgroundColor: "#FEE2E2" },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 8,
  },
  statusText: { fontSize: 16, color: COLORS.textPrimary, fontWeight: "500" },
  leaderStatusText: { color: "#D97706" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
  },
  challengeCount: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  postsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  postsTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  postsCount: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
  emptyPosts: {
    paddingVertical: 80,
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
