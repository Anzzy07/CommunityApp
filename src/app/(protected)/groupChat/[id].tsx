import groupMembers from "@/assets/data/groupMembers.json";
import messages from "@/assets/data/groupMessage.json";
import { groupMembersAtom } from "@/src/atoms/GroupMembersAtom";
import { COLORS } from "@/src/colors";
import ChatMessageItem from "@/src/components/ChatMessageItem";
import JoinGroupView from "@/src/components/JoinGroupView";
import { GroupMessage } from "@/src/types";
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSetAtom } from "jotai";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CURRENT_USER_ID = "user-21";

// Individual group chat screen with messaging, image sending, and leave functionality
export default function GroupChatScreen() {
  const { id: groupId, name: groupName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const setGroupMembers = useSetAtom(groupMembersAtom);

  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Checks if user is a member of this group
  const isMember = groupMembers.some(
    (m) => m.group_id === groupId && m.user_id === CURRENT_USER_ID,
  );

  // Filters messages for this group
  const groupMessages = messages.filter((m) => m.group_id === groupId);

  // Finds the current group to check leadership
  const currentGroup = groupMembers.find((m) => m.group_id === groupId);
  const isLeader = false; // TODO: Check if user is leader from groups data

  // Marks messages as seen when opening chat
  useEffect(() => {
    if (isMember) {
      console.log("Marking messages as seen for group:", groupId);
      // TODO: Mark all messages in this group as seen in Supabase
    }
  }, [groupId, isMember]);

  // Determines which messages should show avatar and username
  const getMessageDisplay = (index: number) => {
    const currentMessage = groupMessages[index];
    const nextMessage = groupMessages[index + 1];
    const prevMessage = groupMessages[index - 1];

    const isMe = currentMessage.user.id === CURRENT_USER_ID;

    if (isMe) {
      return { showAvatar: false, showUsername: false };
    }

    const showUsername =
      !prevMessage || prevMessage.user.id !== currentMessage.user.id;

    const showAvatar =
      !nextMessage || nextMessage.user.id !== currentMessage.user.id;

    return { showAvatar, showUsername };
  };

  // Opens image picker to select image
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Removes selected image
  const removeImage = () => {
    setSelectedImage(null);
  };

  // Sends message with text and/or image
  const handleSend = () => {
    if ((!text.trim() && !selectedImage) || !isMember) return;

    const newMessage = {
      id: Math.random().toString(),
      group_id: groupId,
      user_id: CURRENT_USER_ID,
      message: text.trim(),
      image: selectedImage,
      reply_to: replyTo
        ? {
            id: replyTo.id,
            message: replyTo.message,
            user_name: replyTo.user.name,
          }
        : null,
      created_at: new Date().toISOString(),
    };

    console.log("Sending message:", newMessage);
    // TODO: Send to Supabase
    // TODO: Update local state

    setText("");
    setReplyTo(null);
    setSelectedImage(null);

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Shows leave chat confirmation
  const handleLeaveChat = () => {
    if (isLeader) {
      Alert.alert(
        "Cannot Leave",
        "You're the group leader. Transfer leadership before leaving.",
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert("Leave Chat", `Are you sure you want to leave ${groupName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          setGroupMembers((prev) =>
            prev.filter(
              (m) => !(m.group_id === groupId && m.user_id === CURRENT_USER_ID),
            ),
          );
          router.back();
        },
      },
    ]);
  };

  // Shows chat options menu
  const handleOptions = () => {
    Alert.alert("Chat Options", "", [
      { text: "Leave Chat", onPress: handleLeaveChat, style: "destructive" },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Shows join group UI if not a member
  if (!isMember) {
    return (
      <View style={styles.container}>
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
        <Pressable hitSlop={10} onPress={handleOptions}>
          <Feather name="more-vertical" size={24} color={COLORS.textPrimary} />
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
            <Ionicons name="close" size={20} color={COLORS.textSecondary} />
          </Pressable>
        </View>
      )}

      {/* IMAGE PREVIEW */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <Pressable onPress={removeImage} style={styles.removeImageButton}>
            <Ionicons name="close-circle" size={24} color="white" />
          </Pressable>
        </View>
      )}

      {/* MESSAGE INPUT */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.inputWrapper}>
          {/* IMAGE BUTTON */}
          <Pressable onPress={pickImage} style={styles.imageButton}>
            <Ionicons name="image-outline" size={24} color={COLORS.primary} />
          </Pressable>

          {/* TEXT INPUT */}
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
            maxLength={1000}
          />

          {/* SEND BUTTON */}
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() && !selectedImage}
            style={[
              styles.sendButton,
              !text.trim() && !selectedImage && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons name="send" size={20} color="white" />
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
  imagePreviewContainer: {
    position: "relative",
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: "white",
    borderTopWidth: 0.5,
    borderTopColor: "#E5E7EB",
  },
  imagePreview: {
    width: "100%",
    height: 150,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 20,
    right: 23,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
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
  imageButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
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
