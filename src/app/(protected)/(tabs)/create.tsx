import { selectedGroupAtom } from "@/src/atoms";
import { COLORS } from "@/src/colors";
import { AntDesign } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useAtom } from "jotai";
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

export default function CreateScreen() {
  const [title, setTitle] = useState<string>("");
  const [bodyText, setbodyText] = useState<string>("");
  const [group, setGroup] = useAtom(selectedGroupAtom);

  const goBack = () => {
    setTitle("");
    setbodyText("");
    setGroup(null);
    router.back();
  };
  return (
    <SafeAreaView
      style={{ backgroundColor: COLORS.border, flex: 1, paddingHorizontal: 10 }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          height: 44,
        }}
      >
        <Pressable onPress={goBack} hitSlop={10}>
          <AntDesign name="close" size={30} color={COLORS.primaryDark} />
        </Pressable>

        <Pressable onPress={() => console.log("POST")} hitSlop={10}>
          <Text style={styles.postText}>Post</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Community Selector */}
          <Link href={"groupSelector"} asChild>
            <Pressable style={styles.communityContainer}>
              {group ? (
                <>
                  <Image
                    source={{ uri: group.image }}
                    style={{ width: 20, height: 20, borderRadius: 10 }}
                  />
                  <Text style={{ fontWeight: "600" }}>{group.name}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.kStyles}>k/</Text>
                  <Text style={{ fontWeight: "600" }}>Select a community</Text>
                </>
              )}
            </Pressable>
          </Link>

          {/* Post Title Input */}
          <TextInput
            placeholder="title"
            style={{ fontSize: 20, fontFamily: "bold", paddingVertical: 20 }}
            value={title}
            onChangeText={(text) => setTitle(text)}
            multiline
            scrollEnabled={false}
          />

          {/* Post Input */}
          <TextInput
            placeholder="texts..."
            style={{ fontSize: 20, fontFamily: "bold", paddingVertical: 20 }}
            value={bodyText}
            onChangeText={(text) => setbodyText(text)}
            multiline
            scrollEnabled={false}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  postText: {
    color: "white",
    backgroundColor: COLORS.success,
    fontWeight: "bold",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 15,
  },
  kStyles: {
    backgroundColor: "black",
    color: "white",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 10,
    fontWeight: "bold",
  },
  communityContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.success,
    padding: 10,
    borderRadius: 20,
    gap: 5,
    alignSelf: "flex-start",
    marginVertical: 10,
  },
});
