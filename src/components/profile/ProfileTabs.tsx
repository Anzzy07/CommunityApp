import { COLORS } from "@/src/colors";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type TabType = "posts" | "comments" | "communities";

type ProfileTabsProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

export default function ProfileTabs({
  activeTab,
  onTabChange,
}: ProfileTabsProps) {
  return (
    <View style={styles.tabsContainer}>
      <Pressable
        style={[styles.tab, activeTab === "posts" && styles.activeTab]}
        onPress={() => onTabChange("posts")}
      >
        <MaterialCommunityIcons
          name="post-outline"
          size={20}
          color={activeTab === "posts" ? COLORS.primary : COLORS.textSecondary}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === "posts" && styles.activeTabText,
          ]}
        >
          Posts
        </Text>
      </Pressable>

      <Pressable
        style={[styles.tab, activeTab === "comments" && styles.activeTab]}
        onPress={() => onTabChange("comments")}
      >
        <MaterialCommunityIcons
          name="comment-outline"
          size={20}
          color={
            activeTab === "comments" ? COLORS.primary : COLORS.textSecondary
          }
        />
        <Text
          style={[
            styles.tabText,
            activeTab === "comments" && styles.activeTabText,
          ]}
        >
          Comments
        </Text>
      </Pressable>

      <Pressable
        style={[styles.tab, activeTab === "communities" && styles.activeTab]}
        onPress={() => onTabChange("communities")}
      >
        <Feather
          name="users"
          size={20}
          color={
            activeTab === "communities" ? COLORS.primary : COLORS.textSecondary
          }
        />
        <Text
          style={[
            styles.tabText,
            activeTab === "communities" && styles.activeTabText,
          ]}
        >
          Communities
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
});
