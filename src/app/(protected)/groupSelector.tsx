import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import { useSupabaseGroupMembers } from "@/src/hooks/queries/useSupabaseGroupMembers";
import { useSupabaseGroups } from "@/src/hooks/queries/useSupabaseGroups";
import { Group } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
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

export default function GroupSelector() {
  const { user } = useUser();
  const [searchValue, setSearchValue] = useState("");
  const setGroup = useSetAtom(selectedGroupAtom);

  // Fetch groups and memberships from Supabase
  const { data: groups = [], isLoading: groupsLoading } = useSupabaseGroups();
  const { data: groupMembers = [], isLoading: membersLoading } =
    useSupabaseGroupMembers(user?.id || "");

  const isLoading = groupsLoading || membersLoading;

  console.log("🔍 Group Selector Debug:");
  console.log("- User ID:", user?.id);
  console.log("- Groups loading:", groupsLoading);
  console.log("- Members loading:", membersLoading);
  console.log("- Total groups:", groups.length);
  console.log("- Groups:", groups);
  console.log("- Group members:", groupMembers.length);
  console.log("- Members:", groupMembers);

  // Filter to only show groups the user has joined
  const userGroups = useMemo(() => {
    const userGroupIds = groupMembers.map((m) => m.group_id);
    console.log("- User group IDs:", userGroupIds);

    const filtered = groups.filter((g) => userGroupIds.includes(g.id));
    console.log("- Filtered user groups:", filtered.length, "groups");
    console.log(
      "- Group names:",
      filtered.map((g) => g.name),
    );

    return filtered;
  }, [groups, groupMembers]);

  // Filter by search query
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

        {/* LOADING */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : filterGroups.length > 0 ? (
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
                <Image
                  source={{
                    uri: item.image || "https://via.placeholder.com/48",
                  }}
                  style={styles.groupImage}
                />

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
