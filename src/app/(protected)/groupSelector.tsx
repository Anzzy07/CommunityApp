import groups from "@/assets/data/groups.json";
import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import { Group } from "@/src/types";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAtomValue, useSetAtom } from "jotai";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21"; // current user ID

export default function GroupSelector() {
  const [searchValue, setSearchValue] = useState("");
  const setGroup = useSetAtom(selectedGroupAtom);
  const groupMembers = useAtomValue(groupMembersAtom);

  // Filter to only show groups the user has joined
  const userGroups = useMemo(() => {
    const userGroupIds = groupMembers
      .filter((member) => member.user_id === CURRENT_USER_ID)
      .map((member) => member.group_id);

    return groups.filter((group) => userGroupIds.includes(group.id));
  }, [groupMembers]);

  // Then filter by search query
  const filterGroups = useMemo(
    () =>
      userGroups.filter((group) =>
        group.name.toLowerCase().includes(searchValue.toLowerCase()),
      ),
    [searchValue, userGroups],
  );

  const onGroupSelected = (group: Group) => {
    setGroup(group);
    router.back();
  };

  const clearSearch = () => {
    setSearchValue("");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.closeButton}
          >
            <AntDesign name="close" size={26} color={COLORS.textPrimary} />
          </Pressable>

          <Text style={styles.headerTitle}>Select Community</Text>

          {/* Invisible placeholder for symmetry */}
          <View style={{ width: 26 }} />
        </View>

        {/* SEARCH */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <Ionicons
              name="search"
              size={20}
              color={COLORS.textSecondary}
              style={styles.searchIcon}
            />

            <TextInput
              placeholder="Search communities..."
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              value={searchValue}
              onChangeText={setSearchValue}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />

            {searchValue.length > 0 && (
              <Pressable onPress={clearSearch} hitSlop={10}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            )}
          </View>
        </View>

        {/* RESULTS COUNT */}
        {searchValue.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsText}>
              {filterGroups.length}{" "}
              {filterGroups.length === 1 ? "community" : "communities"} found
            </Text>
          </View>
        )}

        {/* LIST */}
        {filterGroups.length > 0 ? (
          <FlatList
            data={filterGroups}
            keyboardShouldPersistTaps="handled"
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onGroupSelected(item)}
                style={({ pressed }) => [
                  styles.groupItem,
                  pressed && styles.groupItemPressed,
                ]}
              >
                <Image source={{ uri: item.image }} style={styles.groupImage} />

                <View style={styles.groupInfo}>
                  <Text style={styles.groupName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="search-outline"
              size={64}
              color={COLORS.textSecondary}
              style={{ opacity: 0.3 }}
            />
            <Text style={styles.emptyTitle}>
              {searchValue.length > 0
                ? "No communities found"
                : "No joined communities"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchValue.length > 0
                ? "Try searching with different keywords"
                : "Join a community to start posting"}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    marginBottom: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  searchIcon: {
    marginRight: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    padding: 0,
  },
  resultsContainer: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  listContainer: {
    paddingBottom: 24,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  groupItemPressed: {
    backgroundColor: COLORS.surface,
  },
  groupImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    marginRight: 14,
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 74,
    opacity: 0.5,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
});
