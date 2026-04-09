import { COLORS } from "@/src/colors";
import ChatMessageItem from "@/src/components/ChatMessageItem";
import JoinGroupView from "@/src/components/JoinGroupView";
import {
  useMarkMessagesAsRead,
  useSendMessage,
} from "@/src/hooks/mutations/useGroupMessageMutations";
import { useLeaveGroup } from "@/src/hooks/mutations/useGroupMutations";
import { useSupabaseGroupMembers } from "@/src/hooks/queries/useSupabaseGroupMembers";
import {
  useGroupMessagesSubscription,
  useSupabaseGroupMessages,
} from "@/src/hooks/queries/useSupabaseGroupMessages";
import { GroupMessage } from "@/src/types";
import { useUser } from "@clerk/clerk-expo";
import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

export default function GroupChatScreen() {
  const { id: groupId, name: groupName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch messages and user's group memberships
  const { data: messages = [], isLoading: messagesLoading } =
    useSupabaseGroupMessages(groupId);
  const { data: groupMembers = [] } = useSupabaseGroupMembers(user?.id || "");

  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkMessagesAsRead();
  const leaveMutation = useLeaveGroup();

  // Check if current user is a member of this group
  const isMember = groupMembers.some((m) => m.group_id === groupId);

  // Callback to scroll to bottom — passed to the real-time subscription
  // so it fires when any new message arrives on any device
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Subscribe to real-time messages — works for ALL devices including sender's
  // The subscription appends new messages to cache and calls scrollToBottom
  useGroupMessagesSubscription(groupId, scrollToBottom);

  // Mark all unread messages as read when the user opens this chat
  useEffect(() => {
    if (isMember && user?.id) {
      markAsReadMutation.mutate({ groupId, userId: user.id });
    }
  }, [groupId, isMember, user?.id]);

  // Scroll to bottom when messages first load
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 150);
    }
  }, [messages.length]);

  // Groups consecutive messages from the same sender — last shows avatar,
  // first shows username (like WhatsApp/Slack)
  const getMessageDisplay = useCallback(
    (index: number) => {
      const current = messages[index];
      const next = messages[index + 1];
      const prev = messages[index - 1];
      const isMe = current.user.id === user?.id;
      return {
        showAvatar: !next || next.user.id !== current.user.id,
        showUsername: !isMe && (!prev || prev.user.id !== current.user.id),
      };
    },
    [messages, user?.id],
  );

  const pickImage = useCallback(async () => {
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
  }, []);

  // Sends a message — optimistic update makes it appear instantly for the sender.
  // Real-time subscription delivers it to all other devices.
  const handleSend = useCallback(async () => {
    if ((!text.trim() && !selectedImage) || !isMember || !user?.id) return;

    const messageText = text.trim();
    const imageToSend = selectedImage;

    // Clear input immediately so user can keep typing
    setText("");
    setReplyTo(null);
    setSelectedImage(null);

    try {
      await sendMessageMutation.mutateAsync({
        groupId,
        userId: user.id,
        message: messageText,
        imageUrl: imageToSend || undefined,
        replyToId: replyTo?.id,
      });
      scrollToBottom();
    } catch {
      Alert.alert("Error", "Failed to send message");
    }
  }, [
    text,
    selectedImage,
    isMember,
    user?.id,
    groupId,
    replyTo,
    sendMessageMutation,
    scrollToBottom,
  ]);

  const handleLeaveChat = useCallback(() => {
    if (!user?.id) return;
    Alert.alert("Leave Chat", `Leave ${groupName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            await leaveMutation.mutateAsync({ groupId, userId: user.id });
            router.back();
          } catch {
            Alert.alert("Error", "Failed to leave group");
          }
        },
      },
    ]);
  }, [user?.id, groupName, groupId, leaveMutation, router]);

  const handleOptions = useCallback(() => {
    Alert.alert("Chat Options", "", [
      { text: "Leave Chat", onPress: handleLeaveChat, style: "destructive" },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleLeaveChat]);

  // Stable renderItem — useCallback prevents re-rendering all messages on each keystroke
  const renderItem = useCallback(
    ({ item, index }: { item: GroupMessage; index: number }) => {
      const { showAvatar, showUsername } = getMessageDisplay(index);
      return (
        <ChatMessageItem
          item={item}
          isMe={item.user.id === user?.id}
          isMember={isMember}
          onReply={setReplyTo}
          showAvatar={showAvatar}
          showUsername={showUsername}
        />
      );
    },
    [getMessageDisplay, user?.id, isMember],
  );

  const keyExtractor = useCallback((item: GroupMessage) => item.id, []);

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
      {/* Header */}
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

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListEmptyComponent={
          !messagesLoading ? (
            <View style={styles.emptyMessages}>
              <MaterialCommunityIcons
                name="chat-outline"
                size={48}
                color={COLORS.textSecondary}
              />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Start the conversation!</Text>
            </View>
          ) : null
        }
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      {/* Reply preview */}
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

      {/* Image preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <Pressable
            onPress={() => setSelectedImage(null)}
            style={styles.removeImageButton}
          >
            <Ionicons name="close-circle" size={24} color="white" />
          </Pressable>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.inputWrapper}>
          <Pressable onPress={pickImage} style={styles.imageButton}>
            <Ionicons name="image-outline" size={24} color={COLORS.primary} />
          </Pressable>
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
            disabled={
              (!text.trim() && !selectedImage) || sendMessageMutation.isPending
            }
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
    fontSize: 20,
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.primary,
    marginBottom: 2,
  },
  replyMessage: {
    fontSize: 16,
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
    opacity: 0.8,
    backgroundColor: COLORS.secondary,
  },
});
