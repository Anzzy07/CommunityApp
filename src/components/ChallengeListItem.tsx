import { Challenge } from "@/src/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export default function ChallengeListItem({
  challenge,
}: {
  challenge: Challenge;
}) {
  return (
    <View
      style={{
        backgroundColor: "#ECFEFF",
        marginHorizontal: 15,
        marginTop: 12,
        padding: 14,
        borderRadius: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <MaterialCommunityIcons
          name="trophy-outline"
          size={18}
          color="#0369A1"
        />
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#0369A1" }}>
          {challenge.title}
        </Text>
      </View>

      {challenge.description && (
        <Text style={{ marginTop: 6, fontSize: 13, color: "#334155" }}>
          {challenge.description}
        </Text>
      )}
    </View>
  );
}
