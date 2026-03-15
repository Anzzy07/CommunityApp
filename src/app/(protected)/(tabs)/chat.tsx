import { COLORS } from "@/src/colors";
import GroupListItem from "@/src/components/GroupListItem";
import { useSupabaseGroupMembers } from "@/src/hooks/queries/useSupabaseGroupMembers";
import { useSupabaseGroups } from "@/src/hooks/queries/useSupabaseGroups";
import { Group } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
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

  // Fetch groups and memberships from Supabase
  const { data: groups = [], isLoading: groupsLoading } = useSupabaseGroups();
  const { data: groupMembers = [], isLoading: membersLoading } =
    useSupabaseGroupMembers(user?.id || "");

  const isLoading = groupsLoading || membersLoading;

  // Get groups user is a member of
  const userGroups = useMemo(() => {
    const memberGroupIds = groupMembers.map((m) => m.group_id);
    return groups.filter((g) => memberGroupIds.includes(g.id));
  }, [groups, groupMembers]);

  // TODO: Get last message and unread count from Supabase
  const getGroupData = (groupId: string) => {
    // For now, return placeholder data
    // We'll implement this properly with real-time queries later
    return {
      lastMessage: undefined,
      unreadCount: 0,
    };
  };

  const handleGroupPress = (group: Group) => {
    router.push({
      pathname: "/groupChat/[id]",
      params: { id: group.id, name: group.name },
    });
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Feather name="message-circle" size={64} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.emptyTitle}>No Group Chats Yet</Text>
      <Text style={styles.emptySubtitle}>
        Join communities to start chatting with members
      </Text>
    </View>
  );

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
        data={userGroups}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const { lastMessage, unreadCount } = getGroupData(item.id);
          return (
            <GroupListItem
              group={item}
              lastMessage={lastMessage}
              unreadCount={unreadCount}
              onPress={() => handleGroupPress(item)}
            />
          );
        }}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={userGroups.length === 0 && { flex: 1 }}
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
