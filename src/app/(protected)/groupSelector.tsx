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
  const [searchValue, setSearchValue] = useState<string>("");
  const setGroup = useSetAtom(selectedGroupAtom);

  const filterGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const onGroupSelected = (group: Group) => {
    setGroup(group);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: "white", paddingHorizontal: 10 }}
    >
      <SafeAreaView style={{ marginHorizontal: 10, flex: 1 }}>
        <View
          style={{
            height: 44,
            justifyContent: "center",
          }}
        >
          <AntDesign
            name="close"
            size={30}
            color={COLORS.primaryDark}
            onPress={() => router.back()}
            style={{ position: "absolute", left: 0 }}
          />

          <Text
            style={{
              fontSize: 16,
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            Post to
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: "lightgrey",
            borderRadius: 5,
            gap: 5,
            marginVertical: 10,
            alignItems: "center",
            paddingHorizontal: 5,
          }}
        >
          <EvilIcons name="search" size={16} color="black" />
          <TextInput
            placeholder="Search for the community"
            placeholderTextColor={COLORS.primaryDark}
            style={{ paddingVertical: 10, flex: 1 }}
            value={searchValue}
            onChangeText={(text) => setSearchValue(text)}
          />
          {searchValue && (
            <AntDesign
              name="close-circle"
              size={15}
              color="#E4E4E4"
              onPress={() => setSearchValue("")}
            />
          )}
        </View>

        <FlatList
          data={filterGroups}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onGroupSelected(item)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginBottom: 20,
              }}
            >
              <Image
                source={{ uri: item.image }}
                style={{ width: 40, aspectRatio: 1, borderRadius: 20 }}
              />
              <Text style={{ fontWeight: "600" }}>{item.name}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
