import { COLORS } from "@/src/colors";
import GroupListItem from "@/src/components/GroupListItem";
import { useSupabaseGroupLastMessages } from "@/src/hooks/queries/useSupabaseGroupLastMessages";
import { useSupabaseGroupMembers } from "@/src/hooks/queries/useSupabaseGroupMembers";
import { useSupabaseGroups } from "@/src/hooks/queries/useSupabaseGroups";
import { Group } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatGroupsList() {
  const { user } = useUser();
  const router = useRouter();

  // Fetch all available groups and the current user's group memberships in parallel
  const { data: groups = [], isLoading: groupsLoading } = useSupabaseGroups();
  const { data: groupMembers = [], isLoading: membersLoading } =
    useSupabaseGroupMembers(user?.id || "");

  // Keep only groups the user has actually joined — others should not appear in the chat list
  const userGroups = useMemo(() => {
    const memberGroupIds = new Set(groupMembers.map((m) => m.group_id));
    return groups.filter((g) => memberGroupIds.has(g.id));
  }, [groups, groupMembers]);

  // Extract group IDs so the last-messages query knows which groups to fetch for
  const groupIds = useMemo(() => userGroups.map((g) => g.id), [userGroups]);

  // Fetch the most recent message and unread count for every joined group in one batch.
  // Passing currentUserId ensures the unread count excludes messages sent by the user themselves.
  const { data: lastMessages = [], isLoading: messagesLoading } =
    useSupabaseGroupLastMessages(groupIds, user?.id);

  // Combined loading state — the list is not ready until all three queries have resolved
  const isLoading = groupsLoading || membersLoading || messagesLoading;

  // Sort joined groups so the one with the most recent message appears at the top,
  // matching the behaviour users expect from messaging apps
  const sortedGroups = useMemo(() => {
    return [...userGroups].sort((a, b) => {
      const aMsg = lastMessages.find((m) => m?.groupId === a.id);
      const bMsg = lastMessages.find((m) => m?.groupId === b.id);

      // Groups with no messages at all are pushed to the bottom
      if (!aMsg?.timestamp && !bMsg?.timestamp) return 0;
      if (!aMsg?.timestamp) return 1;
      if (!bMsg?.timestamp) return -1;

      // Descending order: newer timestamp wins
      return (
        new Date(bMsg.timestamp).getTime() - new Date(aMsg.timestamp).getTime()
      );
    });
  }, [userGroups, lastMessages]);

  // Navigate to the group chat screen when the user taps a group row
  const handleGroupPress = useCallback(
    (group: Group) => {
      router.push({
        pathname: "/groupChat/[id]",
        params: { id: group.id, name: group.name },
      });
    },
    [router],
  );

  // Stable renderItem callback which prevents every group card from re-rendering
  const renderItem = useCallback(
    ({ item }: { item: Group }) => {
      const msgData = lastMessages.find((m) => m?.groupId === item.id);
      return (
        <GroupListItem
          group={item}
          lastMessage={
            msgData?.message
              ? {
                  text: msgData.message,
                  timestamp: msgData.timestamp ?? null,
                  sender: msgData.sender ?? "",
                }
              : undefined
          }
          // Pass the real unread count so the badge reflects unseen messages only
          unreadCount={msgData?.unreadCount ?? 0}
          onPress={() => handleGroupPress(item)}
        />
      );
    },
    [lastMessages, handleGroupPress],
  );

  const keyExtractor = useCallback((item: Group) => item.id, []);

  // Empty state shown when the user has not joined any groups yet
  const renderEmpty = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Feather
            name="message-circle"
            size={64}
            color={COLORS.textSecondary}
          />
        </View>
        <Text style={styles.emptyTitle}>No Group Chats Yet</Text>
        <Text style={styles.emptySubtitle}>
          Join communities to start chatting with members
        </Text>
      </View>
    ),
    [],
  );

  // Show a full-screen spinner while data is still loading on first mount
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading chats...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={sortedGroups}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        // Allow the empty state view to fill the screen height
        contentContainerStyle={sortedGroups.length === 0 && { flex: 1 }}
        // Performance tuning: unmount off-screen rows and limit batch size
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={8}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
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
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
