import { COLORS } from "@/src/colors";
import { Group } from "@/src/types";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

type CommunitiesGridProps = {
  communities: Group[];
};

export default function CommunitiesGrid({ communities }: CommunitiesGridProps) {
  const router = useRouter();

  if (communities.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="users" size={48} color={COLORS.textSecondary} />
        <Text style={styles.emptyText}>No communities joined yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.communitiesGrid}>
      {communities.map((community) => (
        <Pressable
          key={community.id}
          style={styles.communityCard}
          onPress={() => router.push(`/community/${community.id}`)}
        >
          <Image
            source={{ uri: community.image }}
            style={styles.communityImage}
          />
          <Text style={styles.communityName} numberOfLines={2}>
            {community.name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  communitiesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 15,
  },
  communityCard: {
    width: "31%",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  communityImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  communityName: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
});
