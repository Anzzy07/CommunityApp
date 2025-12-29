import { COLORS } from "@/src/colors";
import { useAuth } from "@clerk/clerk-expo";
import { AntDesign, Entypo, MaterialIcons } from "@expo/vector-icons";
import { Redirect, router, Stack } from "expo-router";
import { View } from "react-native";

export default function AppLayout() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href={"/signIn"} />; // if user is not signedin we will redirect them to signin page
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="post/[id]"
        options={{
          headerTitle: "",
          headerStyle: { backgroundColor: COLORS.headerMain },
          headerLeft: () => (
            <AntDesign
              name="close"
              size={24}
              color="white"
              onPress={() => router.back()}
            />
          ),
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <AntDesign name="search" size={24} color="white" />
              <MaterialIcons name="sort" size={27} color="white" />
              <Entypo name="dots-three-horizontal" size={24} color="white" />
            </View>
          ),
          animation: "slide_from_bottom",
        }}
      />
    </Stack>
  );
}
