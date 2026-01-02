import { COLORS } from "@/src/colors";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
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

export default function CreateScreen() {
  const [title, setTitle] = useState<string>("");
  const [bodyText, setbodyText] = useState<string>("");

  const goBack = () => {
    setTitle("");
    setbodyText("");
    router.back();
  };
  return (
    <SafeAreaView
      style={{ backgroundColor: COLORS.border, flex: 1, paddingHorizontal: 10 }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable onPress={() => goBack()} style={{ marginLeft: "auto" }}>
          <AntDesign
            name="close"
            size={30}
            color={COLORS.primaryDark}
            onPress={() => router.back()}
          />
          <Text style={styles.postText}>Post</Text>
        </Pressable>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Community Selector */}
          <View style={styles.communityContainer}>
            <Text style={styles.kStyles}>k/</Text>
            <Text style={{ fontWeight: "600" }}>Select a community</Text>
          </View>

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
    paddingHorizontal: 5,
    paddingVertical: 2,
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
