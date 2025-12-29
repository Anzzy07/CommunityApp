import { useLocalSearchParams } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function DetailedPost() {
  const { id } = useLocalSearchParams();
  return (
    <View>
      <Text>DetailedPost : {id}</Text>
    </View>
  );
}
