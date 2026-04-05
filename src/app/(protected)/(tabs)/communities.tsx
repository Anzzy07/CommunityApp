import { COLORS } from "@/src/colors";
import {
  useJoinGroup,
  useLeaveGroup,
} from "@/src/hooks/mutations/useGroupMutations";
import { useSupabaseGroupMembers } from "@/src/hooks/queries/useSupabaseGroupMembers";
import { useSupabaseGroups } from "@/src/hooks/queries/useSupabaseGroups";
import { Group } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommunitiesScreen() {
  const { user } = useUser();
  const [searchValue, setSearchValue] = useState("");

  // Fetch all communities and current user's memberships from Supabase
  const {
    data: groups = [],
    isLoading: groupsLoading,
    refetch: refetchGroups,
  } = useSupabaseGroups();

  const {
    data: groupMembers = [],
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = useSupabaseGroupMembers(user?.id || "");

  // Mutation hooks for joining and leaving communities
  const joinMutation = useJoinGroup();
  const leaveMutation = useLeaveGroup();

  const isLoading = groupsLoading || membersLoading;

  // Build a Set of joined group IDs for O(1) lookup
  // Much faster than calling .some() on every render for every card
  const joinedGroupIds = useMemo(
    () => new Set(groupMembers.map((m) => m.group_id)),
    [groupMembers],
  );

  // Check if the current user is a member of a specific group
  const isJoined = useCallback(
    (groupId: string) => joinedGroupIds.has(groupId),
    [joinedGroupIds],
  );

  // Handles both join and leave depending on current membership status.
  // Optimistic updates in useJoinGroup/useLeaveGroup make the button
  // flip instantly without waiting for the server response.
  const handleJoinToggle = useCallback(
    async (group: Group, joined: boolean) => {
      if (!user?.id) {
        Alert.alert("Sign in required", "Please sign in to join communities");
        return;
      }

      if (joined) {
        // Leaders cannot leave their own community
        const isLeader = group.leader_id === user.id;
        if (isLeader) {
          Alert.alert(
            "Cannot Leave",
            "You're the leader of this community. You cannot leave a community you created.",
            [{ text: "OK" }],
          );
          return;
        }

        // Confirm before leaving
        Alert.alert(
          "Leave Community",
          `Are you sure you want to leave ${group.name}?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Leave",
              style: "destructive",
              onPress: async () => {
                try {
                  await leaveMutation.mutateAsync({
                    groupId: group.id,
                    userId: user.id,
                  });
                } catch {
                  Alert.alert(
                    "Error",
                    "Failed to leave group. Please try again.",
                  );
                }
              },
            },
          ],
        );
      } else {
        // Join immediately — optimistic update shows result instantly
        try {
          await joinMutation.mutateAsync({
            groupId: group.id,
            userId: user.id,
          });
        } catch {
          Alert.alert("Error", "Failed to join group. Please try again.");
        }
      }
    },
    [user?.id, joinMutation, leaveMutation],
  );

  // Splits communities into "My Communities" (joined) and "Discover" (not joined)
  // Also filters by search text. Recalculates only when groups, members or search changes.
  const { joinedGroups, discoverGroups } = useMemo(() => {
    const filtered = groups.filter((group) =>
      group.name.toLowerCase().includes(searchValue.toLowerCase()),
    );

    return {
      joinedGroups: filtered.filter((g) => isJoined(g.id)),
      discoverGroups: filtered.filter((g) => !isJoined(g.id)),
    };
  }, [groups, joinedGroupIds, searchValue, isJoined]);

  // Renders a single community card with image, name, and join/leave button
  const renderCommunity = useCallback(
    ({ item }: { item: Group }) => {
      const joined = isJoined(item.id);
      const isLeader = joined && item.leader_id === user?.id;

      return (
        // Tapping the card navigates to the community detail screen
        <Link href={`/community/${item.id}`} asChild>
          <Pressable style={styles.card}>
            {/* Community avatar image */}
            <Image
              source={{
                uri: item.image || "https://via.placeholder.com/400",
              }}
              style={styles.image}
            />

            {/* Community name and membership status */}
            <View style={styles.content}>
              <View style={styles.nameRow}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                {/* Crown icon shown next to communities where user is the leader */}
                {isLeader && (
                  <MaterialCommunityIcons
                    name="crown"
                    size={16}
                    color="#F59E0B"
                  />
                )}
              </View>
              <Text style={styles.subtitle}>
                {joined
                  ? isLeader
                    ? "You're the leader"
                    : "Member"
                  : "Tap to explore"}
              </Text>
            </View>

            {/* Join/Leave button — stopPropagation prevents card navigation when tapping button */}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleJoinToggle(item, joined);
              }}
              disabled={joinMutation.isPending || leaveMutation.isPending}
              style={[
                styles.joinButton,
                joined && styles.joinedButton,
                isLeader && styles.leaderButton,
              ]}
            >
              {joinMutation.isPending || leaveMutation.isPending ? (
                <ActivityIndicator
                  size="small"
                  color={joined ? COLORS.primary : "white"}
                />
              ) : (
                <>
                  {joined ? (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={18}
                      color={isLeader ? "#F59E0B" : COLORS.primary}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="plus-circle"
                      size={18}
                      color="white"
                    />
                  )}
                  <Text
                    style={[
                      styles.joinText,
                      joined && styles.joinedText,
                      isLeader && styles.leaderText,
                    ]}
                  >
                    {joined ? (isLeader ? "Leader" : "Joined") : "Join"}
                  </Text>
                </>
              )}
            </Pressable>
          </Pressable>
        </Link>
      );
    },
    [
      isJoined,
      user?.id,
      handleJoinToggle,
      joinMutation.isPending,
      leaveMutation.isPending,
    ],
  );

  // Renders a section (My Communities or Discover) with a header and its list of cards
  const renderSection = useCallback(
    ({ item }: any) => (
      <>
        {/* Section header showing title and count */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <Text style={styles.sectionCount}>{item.data.length}</Text>
        </View>
        {/* Nested FlatList is scrollDisabled so the outer FlatList handles scrolling */}
        <FlatList
          data={item.data}
          keyExtractor={(g) => g.id}
          renderItem={renderCommunity}
          scrollEnabled={false}
        />
      </>
    ),
    [renderCommunity],
  );

  // Refreshes both groups and members when user pulls down to refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchGroups(), refetchMembers()]);
  }, [refetchGroups, refetchMembers]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Search bar to filter communities by name */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          placeholder="Search communities..."
          placeholderTextColor="rgb(39, 44, 35)"
          style={styles.searchInput}
          value={searchValue}
          onChangeText={setSearchValue}
        />
        {/* Clear button only shown when search has text */}
        {searchValue.length > 0 && (
          <Pressable onPress={() => setSearchValue("")} hitSlop={10}>
            <AntDesign name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {/* Loading spinner shown on first load */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading communities...</Text>
        </View>
      ) : (
        // Main list — sections are "My Communities" and "Discover"
        <FlatList
          data={[
            // Only show "My Communities" section if user has joined at least one
            ...(joinedGroups.length > 0
              ? [{ id: "joined", title: "My Communities", data: joinedGroups }]
              : []),
            // Only show "Discover" section if there are communities to join
            ...(discoverGroups.length > 0
              ? [{ id: "discover", title: "Discover", data: discoverGroups }]
              : []),
          ]}
          keyExtractor={(item) => item.id}
          renderItem={renderSection}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          // Empty state when search returns no results
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Feather name="users" size={48} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No communities found</Text>
              <Text style={styles.emptySubtitle}>
                Try a different search or create a new community
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 15,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 24,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  content: {
    flex: 1,
    marginLeft: 14,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.textPrimary,
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    minWidth: 90,
    justifyContent: "center",
  },
  joinedButton: {
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  leaderButton: {
    backgroundColor: "#FEF3C7",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  joinText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  joinedText: {
    color: COLORS.primary,
  },
  leaderText: {
    color: "#D97706",
  },
  listContent: {
    paddingBottom: 30,
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
    width: 100,
    height: 100,
    borderRadius: 50,
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
