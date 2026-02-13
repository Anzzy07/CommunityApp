import groupMembers from "@/assets/data/groupMembers.json";
import messages from "@/assets/data/groupMessage.json";
import { COLORS } from "@/src/colors";
import ChatMessageItem from "@/src/components/ChatMessageItem";
import JoinGroupView from "@/src/components/JoinGroupView";
import { GroupMessage } from "@/src/types";
import { AntDesign, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef, useState } from "react";
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

const CURRENT_USER_ID = "user-21"; // We will get it from Clerk

export default function GroupChatScreen() {
  const { id: groupId, name: groupName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [text, setText] = useState("");

  // Check if user is a group member
  const isMember = groupMembers.some(
    (m) => m.group_id === groupId && m.user_id === CURRENT_USER_ID,
  );

  // Filter messages for this group
  const groupMessages = messages.filter((m) => m.group_id === groupId);

  // Determine which messages should show avatar and username
  const getMessageDisplay = (index: number) => {
    const currentMessage = groupMessages[index];
    const nextMessage = groupMessages[index + 1];
    const prevMessage = groupMessages[index - 1];

    const isMe = currentMessage.user.id === CURRENT_USER_ID;

    // For "my" messages, never show avatar or username
    if (isMe) {
      return { showAvatar: false, showUsername: false };
    }

    // Show username if:
    // - First message OR
    // - Previous message is from a different user
    const showUsername =
      !prevMessage || prevMessage.user.id !== currentMessage.user.id;

    // Show avatar if:
    // - Last message OR
    // - Next message is from a different user
    const showAvatar =
      !nextMessage || nextMessage.user.id !== currentMessage.user.id;

    return { showAvatar, showUsername };
  };

  // Handle send message
  const handleSend = () => {
    if (!text.trim() || !isMember) return;

    const newMessage = {
      id: Math.random().toString(),
      group_id: groupId,
      user_id: CURRENT_USER_ID,
      message: text,
      reply_to: replyTo
        ? {
            id: replyTo.id,
            message: replyTo.message,
            user_name: replyTo.user.name,
          }
        : null,
      created_at: new Date().toISOString(),
    };

    console.log("Sending message:", newMessage); // TODO: Send to Supabase

    setText("");
    setReplyTo(null);

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // If user is NOT a member, show join group UI
  if (!isMember) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.backButton}
          >
            <AntDesign name="left" size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>{groupName}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Join Group View */}
        <JoinGroupView />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.container}
      keyboardVerticalOffset={insets.top}
    >
      {/* HEADER */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backButton}
        >
          <AntDesign name="left" size={24} color={COLORS.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {groupName}
        </Text>
        <Pressable hitSlop={10}>
          <MaterialCommunityIcons
            name="dots-vertical"
            size={24}
            color={COLORS.textPrimary}
          />
        </Pressable>
      </View>

      {/* MESSAGES LIST */}
      <FlatList
        ref={flatListRef}
        data={groupMessages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        renderItem={({ item, index }) => {
          const { showAvatar, showUsername } = getMessageDisplay(index);
          return (
            <ChatMessageItem
              item={item}
              isMe={item.user.id === CURRENT_USER_ID}
              isMember={isMember}
              onReply={setReplyTo}
              showAvatar={showAvatar}
              showUsername={showUsername}
            />
          );
        }}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <MaterialCommunityIcons
              name="chat-outline"
              size={48}
              color={COLORS.textSecondary}
            />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        }
      />

      {/* REPLY PREVIEW */}
      {replyTo && (
        <View style={styles.replyPreview}>
          <View style={styles.replyIndicator} />
          <View style={styles.replyContent}>
            <Text style={styles.replyLabel}>
              Replying to {replyTo.user.name}
            </Text>
            <Text numberOfLines={1} style={styles.replyMessage}>
              {replyTo.message}
            </Text>
          </View>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={10}>
            <MaterialCommunityIcons
              name="close-circle"
              size={22}
              color={COLORS.textSecondary}
            />
          </Pressable>
        </View>
      )}

      {/* MESSAGE INPUT */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.inputWrapper}>
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim()}
            style={[
              styles.sendButton,
              !text.trim() && styles.sendButtonDisabled,
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 12,
    backgroundColor: "white",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginHorizontal: 12,
  },
  messagesList: {
    paddingVertical: 12,
    flexGrow: 1,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  replyIndicator: {
    width: 3,
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
    marginRight: 12,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 2,
  },
  replyMessage: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  inputContainer: {
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 15,
    paddingTop: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: COLORS.textPrimary,
  },
  sendButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
