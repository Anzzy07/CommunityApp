import { COLORS } from "@/src/colors";
import { useAuth, useUser } from "@clerk/clerk-expo";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { Image, Platform, TouchableOpacity, View } from "react-native";

export default function TabLayout() {
  const { signOut } = useAuth();
  const { user } = useUser();

  const profileImageUrl = user?.imageUrl || "https://via.placeholder.com/32"; // Fallback image

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#000000",
        tabBarStyle: {
          backgroundColor: "#e9f2e3",
        },
        headerTintColor: "#f4f1f1",
        headerTitleStyle: {
          fontFamily: Platform.select({
            ios: "System",
            android: "Roboto",
          }),
          fontSize: 24,
          fontWeight: "bold",
        },
        headerBackground: () => (
          <View style={{ flex: 1, backgroundColor: COLORS.headerMain }} />
        ),

        headerLeft: () => (
          <TouchableOpacity
            // onPress={() => router.push("/profile")} // to profile screen
            style={{ marginLeft: 15 }}
          >
            <Image
              source={{ uri: profileImageUrl }}
              style={{
                width: 25,
                height: 25,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: "#DFE6DA",
              }}
            />
          </TouchableOpacity>
        ),

        headerRight: () => (
          <TouchableOpacity
            onPress={() => signOut()}
            style={{ marginRight: 15 }}
          >
            <Feather name="log-out" size={22} color="#f9f6f6" />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerTitle: "Kommuna",
          tabBarIcon: ({ color }) => (
            <AntDesign name="home" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="communities"
        options={{
          title: "Communities",
          headerTitle: "Communities",
          tabBarIcon: ({ color }) => (
            <Feather name="users" size={24} color={color} />
          ),

          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/createCommunity")}
              style={{ marginRight: 15 }}
            >
              <AntDesign name="plus-circle" size={22} color="white" />
            </TouchableOpacity>
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          headerTitle: "Create Post",
          headerShown: false,
          tabBarStyle: { display: "none" },
          tabBarIcon: ({ color }) => (
            <AntDesign name="plus" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          headerTitle: "Chat",
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="chatbubble-ellipses-outline"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Inbox",
          headerTitle: "Notifications",
          tabBarIcon: ({ color }) => (
            <Feather name="bell" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
