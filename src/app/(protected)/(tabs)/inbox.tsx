import { notificationsAtom } from "@/src/atoms/NotificationAtom";
import NotificationListItem from "@/src/components/NotificationListItem";
import { router } from "expo-router";
import { useAtom } from "jotai";
import React from "react";
import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InboxScreen() {
  const [notifications, setNotifications] = useAtom(notificationsAtom);

  // open notification
  const handlePress = (id: string, type: string, ref: string) => {
    // mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    // routing
    if (type === "comment" || type === "post") {
      router.push(`/post/${ref}`);
    }
    if (type === "challenge") {
      router.push(`/community/${ref}`);
    }
    if (type === "message") {
      router.push("/chat");
    }
  };

  // delete notification
  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#F3F4F6" }}
      edges={["bottom"]}
    >
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <NotificationListItem
            notification={item}
            onPress={() => handlePress(item.id, item.type, item.reference_id)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={{ marginTop: 60, alignItems: "center" }}>
            <Text style={{ color: "#6B7280" }}>No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
