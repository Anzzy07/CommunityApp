import { COLORS } from "@/src/colors";
import { useAuth } from "@clerk/clerk-expo";
import { AntDesign, Entypo, MaterialIcons } from "@expo/vector-icons";
import { Redirect, router, Stack } from "expo-router";
import { Pressable, View } from "react-native";

export default function AppLayout() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href={"/signIn"} />; // if user is not signedin we will redirect them to signin page
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="groupSelector" options={{ headerShown: false }} />
      <Stack.Screen name="createCommunity" options={{ headerShown: false }} />
      <Stack.Screen name="createChallenge" options={{ headerShown: false }} />

      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="editProfile"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="groupChat/[id]"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="challenge/[id]"
        options={{
          headerShown: false,
          animation: "slide_from_right",
        }}
      />

      <Stack.Screen
        name="post/[id]"
        options={{
          animation: "slide_from_bottom",
          headerTitle: "",
          headerStyle: {
            backgroundColor: COLORS.headerMain,
          },

          headerLeft: () => (
            <View
              style={{
                height: "100%",
                alignItems: "center",
                paddingHorizontal: 10,
              }}
            >
              <Pressable onPress={() => router.back()} hitSlop={10}>
                <AntDesign name="close" size={24} color="#727a6a" />
              </Pressable>
            </View>
          ),

          headerRight: () => (
            <View
              style={{
                height: "100%",
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingHorizontal: 14,
              }}
            >
              <AntDesign name="search" size={24} color="#727a6a" />
              <MaterialIcons name="sort" size={27} color="#727a6a" />
              <Entypo name="dots-three-horizontal" size={24} color="#727a6a" />
            </View>
          ),
        }}
      />
      <Stack.Screen
        name="community/[id]"
        options={{
          animation: "slide_from_bottom",
          headerTitle: "",
          headerStyle: {
            backgroundColor: COLORS.headerMain,
          },

          headerLeft: () => (
            <View
              style={{
                height: "100%",
                alignItems: "center",
                paddingHorizontal: 10,
              }}
            >
              <Pressable onPress={() => router.back()} hitSlop={10}>
                <AntDesign name="close" size={24} color="white" />
              </Pressable>
            </View>
          ),
        }}
      />
    </Stack>
  );
}
