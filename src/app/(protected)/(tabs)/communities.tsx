import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { groupsAtom } from "@/src/atoms/GroupsAtom";
import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import { Group } from "@/src/types";
import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21"; // TODO: Get from Clerk

export default function CommunitiesScreen() {
  const groups = useAtomValue(groupsAtom);
  const groupMembers = useAtomValue(groupMembersAtom);
  const setSelectedGroup = useSetAtom(selectedGroupAtom);
  const setGroupMembers = useSetAtom(groupMembersAtom);

  const [searchValue, setSearchValue] = useState("");

  // Check if user joined a group
  const isJoined = (groupId: string) => {
    return groupMembers.some(
      (m) => m.group_id === groupId && m.user_id === CURRENT_USER_ID,
    );
  };

  // Handle join/leave
  const handleJoinToggle = (group: Group, joined: boolean) => {
    if (joined) {
      // Leave group
      setGroupMembers((prev) =>
        prev.filter(
          (m) => !(m.group_id === group.id && m.user_id === CURRENT_USER_ID),
        ),
      );
    } else {
      // Join group
      setGroupMembers((prev) => [
        ...prev,
        {
          id: `gm-${Date.now()}`,
          group_id: group.id,
          user_id: CURRENT_USER_ID,
          joined_at: new Date().toISOString(),
        },
      ]);
    }
  };

  // Split communities into joined & discover
  const { joinedGroups, discoverGroups } = useMemo(() => {
    const filtered = groups.filter((group) =>
      group.name.toLowerCase().includes(searchValue.toLowerCase()),
    );

    return {
      joinedGroups: filtered.filter((g) => isJoined(g.id)),
      discoverGroups: filtered.filter((g) => !isJoined(g.id)),
    };
  }, [groups, groupMembers, searchValue]);

  const renderCommunity = ({ item }: { item: Group }) => {
    const joined = isJoined(item.id);
    const isLeader = joined && item.leader_id === CURRENT_USER_ID; // Only show crown if joined AND leader

    return (
      <Link href={`/community/${item.id}`} asChild>
        <Pressable style={styles.card} onPress={() => setSelectedGroup(item)}>
          {/* Community Image */}
          <Image source={{ uri: item.image }} style={styles.image} />

          {/* Community Info */}
          <View style={styles.content}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
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

          {/* Join/Joined Button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (!isLeader) {
                handleJoinToggle(item, joined);
              }
            }}
            style={[
              styles.joinButton,
              joined && styles.joinedButton,
              isLeader && styles.leaderButton,
            ]}
          >
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
          </Pressable>
        </Pressable>
      </Link>
    );
  };

  const renderSection = ({ item }: any) => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{item.title}</Text>
        <Text style={styles.sectionCount}>{item.data.length}</Text>
      </View>
      <FlatList
        data={item.data}
        keyExtractor={(g) => g.id}
        renderItem={renderCommunity}
        scrollEnabled={false}
      />
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color={COLORS.textSecondary} />
        <TextInput
          placeholder="Search communities..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={searchValue}
          onChangeText={setSearchValue}
        />
        {searchValue.length > 0 && (
          <Pressable onPress={() => setSearchValue("")} hitSlop={10}>
            <AntDesign name="close-circle" size={18} color="#9CA3AF" />
          </Pressable>
        )}
      </View>

      {/* Communities List */}
      <FlatList
        data={[
          ...(joinedGroups.length > 0
            ? [{ id: "joined", title: "My Communities", data: joinedGroups }]
            : []),
          ...(discoverGroups.length > 0
            ? [{ id: "discover", title: "Discover", data: discoverGroups }]
            : []),
        ]}
        keyExtractor={(item) => item.id}
        renderItem={renderSection}
        contentContainerStyle={styles.listContent}
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
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
