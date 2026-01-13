import groupMembers from "@/assets/data/groupMembers.json";
import messages from "@/assets/data/groupMessage.json";
import { COLORS } from "@/src/colors";
import ChatMessageItem from "@/src/components/ChatMessageItem";
import { GroupMessage } from "@/src/types";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21"; // logged-in user
const GROUP_ID = "group-lifestyle"; // active group

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [text, setText] = useState("");

  // check if user is a group member
  const isMember = groupMembers.some(
    (m) => m.group_id === GROUP_ID && m.user_id === CURRENT_USER_ID
  );

  // filter messages for this group
  const groupMessages = messages.filter((m) => m.group_id === GROUP_ID);

  // handle send message (console only for now)
  const handleSend = () => {
    if (!text || !isMember) return;

    const newMessage = {
      group_id: GROUP_ID,
      user_id: CURRENT_USER_ID,
      message: text,
      reply_to: replyTo?.id ?? null,
      created_at: new Date().toISOString(),
    };

    console.log("Sending message:", newMessage); // TEMP: Supabase later

    setText(""); // clear input
    setReplyTo(null); // clear reply
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined} // avoid keyboard overlap
      style={{ flex: 1 }}
      keyboardVerticalOffset={insets.top + 10}
    >
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>r/Lifestyle Chat</Text>
        </View>

        {/* MESSAGES LIST */}
        <FlatList
          data={groupMessages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <ChatMessageItem
              item={item}
              isMe={item.user.id === CURRENT_USER_ID} // check sender
              isMember={isMember}
              onReply={setReplyTo} // set reply message
            />
          )}
        />

        {/* REPLY PREVIEW */}
        {replyTo && (
          <View style={styles.replyPreview}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600" }}>
                Replying to {replyTo.user.name}
              </Text>
              <Text numberOfLines={1}>{replyTo.message}</Text>
            </View>

            {/* CANCEL REPLY */}
            <Pressable onPress={() => setReplyTo(null)}>
              <MaterialCommunityIcons name="close" size={18} />
            </Pressable>
          </View>
        )}

        {/* MESSAGE INPUT */}
        <View style={styles.inputContainer}>
          <TextInput
            placeholder={isMember ? "Type a message..." : "Join group to chat"}
            editable={isMember} // only members can type
            value={text}
            onChangeText={setText}
            style={styles.input}
          />

          {/* SEND BUTTON */}
          <Pressable
            onPress={handleSend} // send message
            disabled={!isMember || !text}
            style={[
              styles.sendButton,
              (!isMember || !text) && { opacity: 0.5 },
            ]}
          >
            <MaterialCommunityIcons name="send" size={20} color="white" />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F2",
  },
  header: {
    padding: 15,
    backgroundColor: "white",
    borderBottomWidth: 0.5,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    backgroundColor: "#EEE",
    borderTopWidth: 0.5,
    borderColor: COLORS.border,
    gap: 10,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#2E5DAA",
    padding: 10,
    borderRadius: 20,
    justifyContent: "center",
  },
});
