import { COLORS } from "@/src/colors";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GroupSelector() {
  return (
    <SafeAreaView>
      <View>
        <AntDesign
          name="close"
          size={30}
          color={COLORS.primaryDark}
          onPress={() => router.back()}
        />
      </View>
    </SafeAreaView>
  );
}
