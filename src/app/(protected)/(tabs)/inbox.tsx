import { notificationsAtom } from "@/src/atoms/NotificationAtom";
import { COLORS } from "@/src/colors";
import NotificationListItem from "@/src/components/NotificationListItem";
import { Notification } from "@/src/types";
import { clearBadge, setBadgeCount } from "@/src/utils/notificationService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useAtom } from "jotai";
import React, { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type FilterType = "all" | "unread";

export default function InboxScreen() {
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [filter, setFilter] = useState<FilterType>("all");

  // Clear badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      clearBadge();
    }, []),
  );

  // Update badge count when notifications change
  React.useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (Platform.OS === "ios") {
      setBadgeCount(unreadCount);
    }
  }, [notifications]);

  // Filter notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  // Separate notifications into today and earlier
  const { todayNotifications, earlierNotifications } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayList: Notification[] = [];
    const earlierList: Notification[] = [];

    filteredNotifications.forEach((notification) => {
      const notifDate = new Date(notification.created_at);
      notifDate.setHours(0, 0, 0, 0);

      if (notifDate.getTime() === today.getTime()) {
        todayList.push(notification);
      } else {
        earlierList.push(notification);
      }
    });

    return {
      todayNotifications: todayList,
      earlierNotifications: earlierList,
    };
  }, [filteredNotifications]);

  // Combine with section headers
  const sectionsData = useMemo(() => {
    const data: Array<Notification | { type: "header"; title: string }> = [];

    if (todayNotifications.length > 0) {
      data.push({ type: "header", title: "Today" });
      data.push(...todayNotifications);
    }

    if (earlierNotifications.length > 0) {
      data.push({ type: "header", title: "Earlier" });
      data.push(...earlierNotifications);
    }

    return data;
  }, [todayNotifications, earlierNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Handle notification press
  const handlePress = (id: string, type: string, ref: string) => {
    // Mark as read
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    // Navigate based on type
    if (type === "comment" || type === "post" || type === "poll") {
      router.push(`/post/${ref}`);
    }
    if (type === "challenge") {
      router.push(`/community/${ref}`);
    }
    if (type === "message") {
      router.push("/chat");
    }
  };

  // Delete notification
  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Mark all as read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    clearBadge();
  };

  const renderItem = ({
    item,
  }: {
    item: Notification | { type: "header"; title: string };
  }) => {
    // Render section header
    if ("type" in item && item.type === "header") {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{item.title}</Text>
        </View>
      );
    }

    // Render notification item
    const notification = item as Notification;
    return (
      <NotificationListItem
        notification={notification}
        onPress={() =>
          handlePress(
            notification.id,
            notification.type,
            notification.reference_id,
          )
        }
        onDelete={() => handleDelete(notification.id)}
      />
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Filter Tabs with Mark as Read */}
      <View style={styles.filterContainer}>
        <Pressable
          onPress={() => setFilter("all")}
          style={[styles.filterTab, filter === "all" && styles.activeFilterTab]}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.activeFilterText,
            ]}
          >
            All ({notifications.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setFilter("unread")}
          style={[
            styles.filterTab,
            filter === "unread" && styles.activeFilterTab,
          ]}
        >
          <Text
            style={[
              styles.filterText,
              filter === "unread" && styles.activeFilterText,
            ]}
          >
            Unread ({unreadCount})
          </Text>
        </Pressable>

        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <Pressable
            onPress={handleMarkAllRead}
            style={styles.markAsReadButton}
          >
            <MaterialCommunityIcons
              name="check-all"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.markAsReadText}>Mark as read</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <MaterialCommunityIcons
          name="bell-outline"
          size={64}
          color={COLORS.textSecondary}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {filter === "unread" ? "All caught up!" : "No notifications yet"}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === "unread"
          ? "You've read all your notifications"
          : "We'll notify you when something happens"}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={sectionsData}
        keyExtractor={(item, index) =>
          "type" in item && item.type === "header"
            ? `header-${item.title}`
            : (item as Notification).id
        }
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "white",
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 8,
    alignItems: "center",
  },
  filterTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: "white",
    fontWeight: "600",
  },
  markAsReadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    marginLeft: "auto",
  },
  markAsReadText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.primary,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F9FAFB",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
});
