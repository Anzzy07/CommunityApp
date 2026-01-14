import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../colors";

export default function JoinGroupView() {
  return (
    <View style={joinStyles.container}>
      <Text style={joinStyles.title}>Join this group to chat</Text>
      <Text style={joinStyles.subtitle}>
        You need to join this community before you can send or reply to
        messages.
      </Text>

      <Pressable
        style={joinStyles.button}
        onPress={() => console.log("Join group")}
      >
        <Text style={joinStyles.buttonText}>Join Group</Text>
      </Pressable>
    </View>
  );
}

const joinStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  button: {
    backgroundColor: COLORS.button,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 25,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
