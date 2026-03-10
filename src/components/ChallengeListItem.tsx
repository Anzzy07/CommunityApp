import { Challenge } from "@/src/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatDistanceToNowStrict, isPast } from "date-fns";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  challenge: Challenge;
};

export default function ChallengeListItem({ challenge }: Props) {
  const endDate = new Date(challenge.end_date);
  const isExpired = isPast(endDate);
  const timeRemaining = formatDistanceToNowStrict(endDate, {
    addSuffix: false,
  });

  return (
    <Pressable
      onPress={() => router.push(`/challenge/${challenge.id}`)}
      style={[styles.container, isExpired && styles.expiredContainer]}
    >
      {/* Icon & Title */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, isExpired && styles.expiredIcon]}>
          <MaterialCommunityIcons
            name={isExpired ? "trophy" : "trophy-outline"}
            size={20}
            color={isExpired ? "#9CA3AF" : "#0369A1"}
          />
        </View>
        <Text
          style={[styles.title, isExpired && styles.expiredTitle]}
          numberOfLines={1}
        >
          {challenge.title}
        </Text>
      </View>

      {/* Description */}
      {challenge.description && (
        <Text
          style={[styles.description, isExpired && styles.expiredDescription]}
          numberOfLines={2}
        >
          {challenge.description}
        </Text>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.timeContainer}>
          <MaterialCommunityIcons
            name={isExpired ? "clock-outline" : "clock-time-four-outline"}
            size={14}
            color={isExpired ? "#9CA3AF" : "#0369A1"}
          />
          <Text style={[styles.timeText, isExpired && styles.expiredTimeText]}>
            {isExpired ? "Ended" : `${timeRemaining} left`}
          </Text>
        </View>

        {!isExpired && (
          <View style={styles.statusBadge}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Active</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ECFEFF",
    marginHorizontal: 15,
    marginBottom: 12,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#0369A1",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expiredContainer: {
    backgroundColor: "#F3F4F6",
    borderLeftColor: "#9CA3AF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  expiredIcon: {
    backgroundColor: "#E5E7EB",
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#0369A1",
  },
  expiredTitle: {
    color: "#6B7280",
  },
  description: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    marginBottom: 12,
  },
  expiredDescription: {
    color: "#9CA3AF",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#0369A1",
  },
  expiredTimeText: {
    color: "#9CA3AF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#059669",
  },
});
