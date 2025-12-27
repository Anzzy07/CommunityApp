import { COLORS } from "@/src/colors";
import { useAuth } from "@clerk/clerk-expo";
import { AntDesign, Feather, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform, View } from "react-native";

export default function TabLayout() {
  const { signOut } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: "#000000",
        tabBarStyle: {
          backgroundColor: "#DFE6DA",
        },
        headerTintColor: "#e3dfdf",
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
        headerRight: () => (
          <Feather
            name="log-out"
            size={22}
            color="#f9f6f6"
            style={{ marginRight: 15 }}
            onPress={() => signOut()}
          />
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
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          headerTitle: "Create Post",
          headerShown: false, // Keeps header hidden
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
