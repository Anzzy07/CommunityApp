import { selectedGroupAtom } from "@/src/atoms/SelectGroupAtom";
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

  const [titleFocused, setTitleFocused] = useState(false);
  const [bodyFocused, setBodyFocused] = useState(false);

  const goBack = () => {
    setTitle("");
    setbodyText("");
    setGroup(null);
    router.back();
  };

  return (
    <SafeAreaView
      style={{
        backgroundColor: COLORS.background,
        flex: 1,
        paddingHorizontal: 10,
      }}
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
          <AntDesign name="close" size={30} color={COLORS.button} />
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
                  <Text style={{ fontWeight: "600", color: "#fff" }}>
                    {group.name}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.kStyles}>k/</Text>
                  <Text style={{ fontWeight: "600", color: "#fff" }}>
                    Select a community
                  </Text>
                </>
              )}
            </Pressable>
          </Link>
          {/* Title Input */}
          <View
            style={{
              borderBottomWidth: titleFocused ? 2 : 1,
              borderBottomColor: titleFocused ? COLORS.button : "#ddd",
              marginTop: 20,
            }}
          >
            <TextInput
              placeholder="An interesting title"
              placeholderTextColor="#888"
              style={{
                fontSize: 28,
                fontWeight: "bold",
                color: COLORS.text || "#000",
                paddingVertical: 16,
                paddingHorizontal: 4,
              }}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
              multiline
              scrollEnabled={false}
              selectionColor={COLORS.button}
              autoFocus={false}
            />
          </View>
          {/* Body Input  */}
          <View
            style={{
              borderBottomWidth: bodyFocused ? 2 : 0,
              borderBottomColor: COLORS.button,
              marginTop: 32,
            }}
          >
            <TextInput
              placeholder="Text (optional)"
              placeholderTextColor="#888"
              style={{
                fontSize: 20,
                color: COLORS.text || "#000",
                paddingVertical: 20,
                paddingHorizontal: 4,
                minHeight: 300,
                textAlignVertical: "top",
              }}
              value={bodyText}
              onChangeText={setbodyText}
              onFocus={() => setBodyFocused(true)}
              onBlur={() => setBodyFocused(false)}
              multiline
              scrollEnabled={false}
              selectionColor={COLORS.button}
            />
          </View>

          <View style={{ height: 100 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  kStyles: {
    backgroundColor: "black",
    color: "white",
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 10,
    fontWeight: "bold",
    marginRight: 5,
  },
  communityContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    alignSelf: "flex-start",
    marginVertical: 12,
    alignItems: "center",
  },
});
