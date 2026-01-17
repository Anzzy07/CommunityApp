import { challengesAtom } from "@/src/atoms/ChallangesAtom";
import { COLORS } from "@/src/colors";
import { AntDesign } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useState } from "react";
import {
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

const CURRENT_USER_ID = "user-21";

export default function CreateChallengeScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const setChallenges = useSetAtom(challengesAtom);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!title.trim() || !groupId) return;

    setChallenges((prev) => [
      {
        id: `challenge-${Date.now()}`,
        group_id: groupId,
        title: title.trim(),
        description: description.trim() || null,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 86400000).toISOString(),
        created_by: CURRENT_USER_ID,
      },
      ...prev,
    ]);

    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <AntDesign name="close" size={26} color="white" />
        </Pressable>

        <Text style={styles.headerTitle}>Create Challenge</Text>

        <Pressable onPress={handleCreate} disabled={!title.trim()}>
          <Text style={[styles.createText, !title.trim() && { opacity: 0.5 }]}>
            Create
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Challenge title</Text>
            <TextInput
              placeholder="e.g. 30 Day Fitness"
              value={title}
              onChangeText={setTitle}
              style={styles.input}
            />
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              placeholder="What’s the goal?"
              value={description}
              onChangeText={setDescription}
              multiline
              style={[styles.input, { minHeight: 100 }]}
            />
          </View>
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
  inputWrapper: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
  },
});
