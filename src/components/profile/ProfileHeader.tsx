import { COLORS } from "@/src/colors";
import { UserStreak } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type User = ReturnType<typeof useUser>["user"];

type ProfileHeaderProps = {
  user: User | null | undefined;
  userStreak: UserStreak | undefined;
  totalPosts: number;
  totalUpvotes: number;
  communitiesCount: number;
  isOwnProfile: boolean;
  onEditProfile: () => void;
};

export default function ProfileHeader({
  user,
  userStreak,
  totalPosts,
  totalUpvotes,
  communitiesCount,
  isOwnProfile,
  onEditProfile,
}: ProfileHeaderProps) {
  return (
    <View style={styles.profileSection}>
      {/* Avatar and Basic Info */}
      <View style={styles.profileHeader}>
        <Image
          source={{
            uri: user?.imageUrl || "https://via.placeholder.com/80",
          }}
          style={styles.avatar}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.name}>{user?.fullName || "User Name"}</Text>
          <Text style={styles.username}>
            @
            {user?.username ||
              user?.emailAddresses[0].emailAddress.split("@")[0]}
          </Text>
        </View>
      </View>

      {/* Streak Display */}
      {userStreak && (userStreak.current_streak ?? 0) > 0 && (
        <View style={styles.streakContainer}>
          <View style={styles.streakBadge}>
            <MaterialCommunityIcons name="fire" size={28} color="#FF6A00" />
            <Text style={styles.streakNumber}>{userStreak.current_streak}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Day Streak! 🔥</Text>
            <Text style={styles.streakSubtitle}>
              Longest: {userStreak.longest_streak} days
            </Text>
          </View>
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalPosts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalUpvotes}</Text>
          <Text style={styles.statLabel}>Upvotes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{communitiesCount}</Text>
          <Text style={styles.statLabel}>Communities</Text>
        </View>
      </View>

      {/* Action Buttons */}
      {isOwnProfile && (
        <View style={styles.actionButtons}>
          <Pressable style={styles.editButton} onPress={onEditProfile}>
            <Feather name="edit-2" size={16} color={COLORS.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  profileSection: {
    backgroundColor: "white",
    paddingVertical: 20,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  nameContainer: {
    marginLeft: 15,
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  username: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  streakContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5E6",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#FF6A00",
    marginLeft: 4,
  },
  streakTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#D84315",
  },
  streakSubtitle: {
    fontSize: 13,
    color: "#BF360C",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 15,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    marginBottom: 15,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#D4D4D4",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.background,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    gap: 8,
  },
  editButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 15,
  },
});
