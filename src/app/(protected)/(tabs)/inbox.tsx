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

// Main inbox screen displaying all notifications with filtering and actions
export default function InboxScreen() {
  const [notifications, setNotifications] = useAtom(notificationsAtom);
  const [filter, setFilter] = useState<FilterType>("all");

  // Clears badge when screen is focused
  useFocusEffect(
    useCallback(() => {
      clearBadge();
    }, []),
  );

  // Updates badge count when notifications change
  React.useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (Platform.OS === "ios") {
      setBadgeCount(unreadCount);
    }
  }, [notifications]);

  // Filters notifications based on selected filter
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  // Separates notifications into today and earlier sections
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

  // Combines notifications with section headers for FlatList
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

  // Marks notification as read and navigates to relevant screen
  const handlePress = (id: string, type: string, ref: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

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

  // Removes notification from the list
  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  // Marks all notifications as read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    clearBadge();
  };

  // Renders either section header or notification item
  const renderItem = ({
    item,
  }: {
    item: Notification | { type: "header"; title: string };
  }) => {
    if ("type" in item && item.type === "header") {
      return (
        <View style={styles.sectionHeader}>
          <View style={styles.sectionHeaderLine} />
          <Text style={styles.sectionTitle}>{item.title}</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
      );
    }

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

  // Renders filter tabs and mark all as read button
  const renderHeader = () => (
    <View style={styles.header}>
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
            All
          </Text>
          <View
            style={[
              styles.filterBadge,
              filter === "all" && styles.activeFilterBadge,
            ]}
          >
            <Text
              style={[
                styles.filterBadgeText,
                filter === "all" && styles.activeFilterBadgeText,
              ]}
            >
              {notifications.length}
            </Text>
          </View>
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
            Unread
          </Text>
          <View
            style={[
              styles.filterBadge,
              filter === "unread" && styles.activeFilterBadge,
            ]}
          >
            <Text
              style={[
                styles.filterBadgeText,
                filter === "unread" && styles.activeFilterBadgeText,
              ]}
            >
              {unreadCount}
            </Text>
          </View>
        </Pressable>

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
            <Text style={styles.markAsReadText}>Mark all read</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  // Renders empty state when no notifications
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
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "white",
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    gap: 6,
  },
  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  activeFilterText: {
    color: "white",
  },
  filterBadge: {
    backgroundColor: "white",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: "center",
  },
  activeFilterBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  filterBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  activeFilterBadgeText: {
    color: "white",
  },
  markAsReadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    marginLeft: "auto",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  markAsReadText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
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
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
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
