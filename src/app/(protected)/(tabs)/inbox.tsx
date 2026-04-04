import { COLORS } from "@/src/colors";
import NotificationListItem from "@/src/components/NotificationListItem";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@/src/hooks/mutations/useNotificationMutations";
import { useSupabaseNotifications } from "@/src/hooks/queries/useSupabaseNotifications";
import { Notification } from "@/src/types";
import { clearBadge, setBadgeCount } from "@/src/utils/notificationService";
import { useUser } from "@clerk/clerk-expo";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
  const { user } = useUser();
  const [filter, setFilter] = useState<FilterType>("all");

  const {
    data: notifications = [],
    isLoading,
    refetch,
  } = useSupabaseNotifications(user?.id || "");

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Clears the app badge when the notifications screen is focused
  useFocusEffect(
    useCallback(() => {
      clearBadge();
    }, []),
  );

  // Keeps the iOS badge count in sync with actual unread count
  useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    if (Platform.OS === "ios") {
      setBadgeCount(unreadCount);
    }
  }, [notifications]);

  // Filters notifications based on selected tab (all / unread)
  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.is_read);
    }
    return notifications;
  }, [notifications, filter]);

  // Separates filtered notifications into today and earlier sections
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

    return { todayNotifications: todayList, earlierNotifications: earlierList };
  }, [filteredNotifications]);

  // Combines section headers and notifications into a single flat list for FlatList
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

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications],
  );

  // Marks notification as read optimistically then navigates to relevant content
  const handlePress = useCallback(
    async (id: string, type: string, ref: string) => {
      // Optimistic update runs instantly — unread dot disappears before navigation
      await markReadMutation.mutateAsync(id);

      // Navigate to the relevant screen based on notification type
      if (type === "comment" || type === "post" || type === "poll") {
        router.push(`/post/${ref}`);
      }
      if (type === "challenge") {
        router.push(`/community/${ref}`);
      }
      if (type === "message") {
        router.push("/chat");
      }
    },
    [markReadMutation],
  );

  // Marks all notifications as read and clears the app badge
  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id) return;
    await markAllReadMutation.mutateAsync(user.id);
    clearBadge();
  }, [user?.id, markAllReadMutation]);

  // Stable keyExtractor — section headers use their title, notifications use id
  const keyExtractor = useCallback(
    (item: Notification | { type: "header"; title: string }, index: number) => {
      if ("type" in item && item.type === "header") {
        return `header-${item.title}`;
      }
      return (item as Notification).id;
    },
    [],
  );

  // Renders either a section header divider or a swipeable notification card
  const renderItem = useCallback(
    ({ item }: { item: Notification | { type: "header"; title: string } }) => {
      // Section header divider
      if ("type" in item && item.type === "header") {
        return (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLine} />
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <View style={styles.sectionHeaderLine} />
          </View>
        );
      }

      // Notification card with swipe-to-delete
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
          onDelete={() => {}}
        />
      );
    },
    [handlePress],
  );

  // Filter tabs and mark all read button shown above the list
  const renderHeader = useCallback(
    () => (
      <View style={styles.header}>
        <View style={styles.filterContainer}>
          {/* All notifications tab */}
          <Pressable
            onPress={() => setFilter("all")}
            style={[
              styles.filterTab,
              filter === "all" && styles.activeFilterTab,
            ]}
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

          {/* Unread only tab */}
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

          {/* Mark all read button — only shown when there are unread notifications */}
          {unreadCount > 0 && (
            <Pressable
              onPress={handleMarkAllRead}
              style={styles.markAsReadButton}
              disabled={markAllReadMutation.isPending}
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
    ),
    [
      filter,
      notifications.length,
      unreadCount,
      handleMarkAllRead,
      markAllReadMutation.isPending,
    ],
  );

  // Empty state — shows loading spinner or empty message based on state
  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      );
    }

    return (
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
  }, [isLoading, filter]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FlatList
        data={sectionsData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
        // Performance
        removeClippedSubviews={true}
        maxToRenderPerBatch={15}
        windowSize={8}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: COLORS.textSecondary,
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
    shadowOffset: { width: 0, height: 2 },
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
