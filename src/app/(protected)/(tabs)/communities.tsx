import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { groupsAtom } from "@/src/atoms/GroupsAtom";
import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { useAtomValue, useSetAtom } from "jotai";

import { COLORS } from "@/src/colors";
import { Group } from "@/src/types";
import { AntDesign, EvilIcons } from "@expo/vector-icons";
import { Link } from "expo-router";
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

const CURRENT_USER_ID = "user-21";

export default function CommunitiesScreen() {
  // global state
  const groups = useAtomValue(groupsAtom);
  const groupMembers = useAtomValue(groupMembersAtom);
  const setSelectedGroup = useSetAtom(selectedGroupAtom);

  const [searchValue, setSearchValue] = useState("");

  // check if user joined a group
  const isJoined = (groupId: string) => {
    return groupMembers.some(
      (m) => m.group_id === groupId && m.user_id === CURRENT_USER_ID
    );
  };

  // split communities into joined & discover
  const { joinedGroups, discoverGroups } = useMemo(() => {
    const filtered = groups.filter((group) =>
      group.name.toLowerCase().includes(searchValue.toLowerCase())
    );

    return {
      joinedGroups: filtered.filter((g) => isJoined(g.id)),
      discoverGroups: filtered.filter((g) => !isJoined(g.id)),
    };
  }, [groups, groupMembers, searchValue]);

  // single community card
  const renderCommunity = ({ item }: { item: Group }) => {
    const joined = isJoined(item.id);

    return (
      <Link href={`/community/${item.id}`} asChild>
        <Pressable
          style={styles.card}
          onPress={() => setSelectedGroup(item)} // store selected group globally
        >
          {/* Community avatar */}
          <Image source={{ uri: item.image }} style={styles.image} />

          {/* Community name & subtitle */}
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.subText}>
              {joined ? "You are a member" : "Tap to explore"}
            </Text>
          </View>

          {/* Join / Joined button */}
          <Pressable
            onPress={(e) => {
              e.stopPropagation(); // prevent routing
              console.log(
                joined ? "Already joined" : "Join community",
                item.id
              );
            }}
            style={[styles.joinButton, joined && styles.joinedButton]}
          >
            <Text style={[styles.joinText, joined && { color: "#555" }]}>
              {joined ? "Joined" : "Join"}
            </Text>
          </Pressable>
        </Pressable>
      </Link>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <EvilIcons name="search" size={18} color="#555" />

        <TextInput
          placeholder="Search communities"
          style={styles.searchInput}
          value={searchValue}
          onChangeText={setSearchValue}
        />

        {/* Clear search */}
        {searchValue.length > 0 && (
          <AntDesign
            name="close-circle"
            size={16}
            color="#999"
            onPress={() => setSearchValue("")}
          />
        )}
      </View>

      {/* Communities list */}
      <FlatList
        data={[
          ...(joinedGroups.length
            ? [{ id: "joined", title: "My Communities", data: joinedGroups }]
            : []),
          {
            id: "discover",
            title: "Discover Communities",
            data: discoverGroups,
          },
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }: any) => (
          <>
            {/* Section title */}
            <Text style={styles.sectionTitle}>{item.title}</Text>

            {/* Section items */}
            <FlatList
              data={item.data}
              keyExtractor={(g) => g.id}
              renderItem={renderCommunity}
              scrollEnabled={false}
            />
          </>
        )}
        contentContainerStyle={{ paddingBottom: 30 }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No communities found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 12,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  sectionTitle: {
    marginHorizontal: 15,
    marginTop: 15,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#555",
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    gap: 14,
    minHeight: 100,

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  image: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },

  name: {
    fontSize: 17,
    fontWeight: "600",
  },

  subText: {
    fontSize: 14,
    color: "#777",
    marginTop: 2,
  },

  joinButton: {
    backgroundColor: COLORS.button,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },

  joinedButton: {
    backgroundColor: COLORS.button,
  },

  joinText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  emptyText: {
    textAlign: "center",
    marginTop: 50,
    color: "#777",
  },
});
