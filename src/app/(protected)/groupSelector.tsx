import groups from "@/assets/data/groups.json";
import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
import { COLORS } from "@/src/colors";
import { Group } from "@/src/types";
import { AntDesign, EvilIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupSelector() {
  const [searchValue, setSearchValue] = useState("");
  const setGroup = useSetAtom(selectedGroupAtom);

  const filterGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchValue.toLowerCase()),
  );

  const onGroupSelected = (group: Group) => {
    setGroup(group);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: COLORS.background }}
    >
      <SafeAreaView style={{ flex: 1, paddingHorizontal: 14 }}>
        {/* HEADER */}
        <View
          style={{
            height: 48,
            justifyContent: "center",
            marginBottom: 8,
          }}
        >
          <AntDesign
            name="close"
            size={26}
            color={COLORS.textPrimary}
            onPress={() => router.back()}
            style={{ position: "absolute", left: 0 }}
          />

          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              textAlign: "center",
              color: COLORS.textPrimary,
            }}
          >
            Post to
          </Text>
        </View>

        {/* SEARCH */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: COLORS.border,
            marginBottom: 14,
          }}
        >
          <EvilIcons name="search" size={18} color={COLORS.textSecondary} />

          <TextInput
            placeholder="Search for the community"
            placeholderTextColor={COLORS.textSecondary}
            style={{
              flex: 1,
              paddingVertical: 6,
              color: COLORS.textPrimary,
            }}
            value={searchValue}
            onChangeText={setSearchValue}
          />

          {searchValue.length > 0 && (
            <AntDesign
              name="close-circle"
              size={16}
              color={COLORS.textSecondary}
              onPress={() => setSearchValue("")}
            />
          )}
        </View>

        {/* LIST */}
        <FlatList
          data={filterGroups}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onGroupSelected(item)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                paddingVertical: 10,
                paddingHorizontal: 6,
                borderRadius: 12,
              }}
            >
              <Image
                source={{ uri: item.image }}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: COLORS.surface,
                }}
              />

              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: COLORS.textPrimary,
                }}
              >
                {item.name}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
