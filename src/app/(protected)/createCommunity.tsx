import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { groupsAtom } from "@/src/atoms/GroupsAtom";
import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21"; // mock logged-in user

export default function CreateCommunityScreen() {
  const setGroups = useSetAtom(groupsAtom);
  const setGroupMembers = useSetAtom(groupMembersAtom);
  const setSelectedGroup = useSetAtom(selectedGroupAtom);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // create community handler
  const handleCreate = () => {
    if (!name.trim()) return;

    const newGroupId = `group-${Date.now()}`;

    // new community
    const newGroup = {
      id: newGroupId,
      name: name.trim(),
      image: "https://via.placeholder.com/80",
      leader_id: CURRENT_USER_ID, // creator becomes leader
    };

    // add community
    setGroups((prev) => [newGroup, ...prev]);

    // auto-join creator
    setGroupMembers((prev) => [
      ...prev,
      {
        id: `gm-${Date.now()}`,
        group_id: newGroupId,
        user_id: CURRENT_USER_ID,
        joined_at: new Date().toISOString(),
      },
    ]);

    // set selected group globally
    setSelectedGroup(newGroup);

    // reset state
    setName("");
    setDescription("");

    // redirect to community details
    router.replace(`/community/${newGroupId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <AntDesign name="close" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Create Community</Text>

        <Pressable onPress={handleCreate} disabled={!name.trim()} hitSlop={10}>
          <Text style={[styles.createText, !name.trim() && { opacity: 0.5 }]}>
            Create
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* COMMUNITY AVATAR */}
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: "https://via.placeholder.com/80" }}
              style={styles.avatar}
            />
            <Text style={styles.avatarText}>Community icon</Text>
          </View>

          {/* NAME */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Community name</Text>
            <TextInput
              placeholder="e.g. Fitness, Music, Startups"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
          </View>

          {/* DESCRIPTION */}
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              placeholder="What is this community about?"
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, { minHeight: 100 }]}
            />
          </View>

          {/* INFO */}
          <Text style={styles.infoText}>
            You will be the admin of this community and can create challenges.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.headerMain,
  },

  header: {
    height: 48,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },

  createText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },

  avatarContainer: {
    alignItems: "center",
    marginBottom: 30,
  },

  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
  },

  avatarText: {
    marginTop: 8,
    color: "#E5E7EB",
    fontSize: 13,
  },

  inputWrapper: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  focusedBorder: {
    borderColor: COLORS.button,
  },

  label: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },

  input: {
    fontSize: 16,
    color: "#111827",
  },

  infoText: {
    fontSize: 12,
    color: "#E5E7EB",
    marginTop: 10,
    textAlign: "center",
  },
});
