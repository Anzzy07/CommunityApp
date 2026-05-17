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
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
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
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // KEY FIX: useLocalSearchParams can return string | string[] for dynamic routes.
  // Always coerce to a plain string so the React Query cache key is always identical
  // to what useSupabaseGroupMessages and useGroupMessagesSubscription use.
  // If it were ever an array, cache keys would never match and setQueryData
  // from the real-time subscription would update a different cache entry.
  const groupId = Array.isArray(params.id) ? params.id[0] : params.id;
  const groupName = Array.isArray(params.name) ? params.name[0] : params.name;

  // Ref to the FlatList so we can programmatically scroll to the bottom
  const flatListRef = useRef<FlatList>(null);

  // Local composer state
  const [replyTo, setReplyTo] = useState<GroupMessage | null>(null);
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Fetch all messages for this group.
  // staleTime is 0 and refetchInterval is 3s (set in the hook) so:
  // - navigating in always loads fresh data immediately
  // - polling every 3s catches any messages the real-time subscription missed
  const {
    data: messages = [],
    isLoading: messagesLoading,
    refetch: refetchMessages,
  } = useSupabaseGroupMessages(groupId);

  // Fetch current user's group memberships to check if they can send messages
  const { data: groupMembers = [] } = useSupabaseGroupMembers(user?.id || "");

  const sendMessageMutation = useSendMessage();
  const markAsReadMutation = useMarkMessagesAsRead();
  const leaveMutation = useLeaveGroup();

  // Check membership using the coerced string groupId — consistent with all other checks
  const isMember = groupMembers.some((m) => m.group_id === groupId);

  // Scroll to the bottom of the message list.
  // animated=true for new messages, animated=false for initial load.
  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated });
    }, 100);
  }, []);

  // Real-time subscription — listens for INSERT events on group_messages.
  // Uses the coerced string groupId to ensure it subscribes to the correct
  // Supabase channel and updates the correct React Query cache entry.
  useGroupMessagesSubscription(groupId, () => scrollToBottom(true));

  // useFocusEffect fires every time this screen comes into focus.
  // This covers the case where Device 2 already has the screen mounted
  // but navigates away and comes back — it will refetch on return.
  // Combined with refetchInterval:3000 in the hook, new messages
  // always appear within 3 seconds at most even if real-time is slow.
  useFocusEffect(
    useCallback(() => {
      if (groupId) {
        refetchMessages();
      }
    }, [groupId, refetchMessages]),
  );

  // Mark all unread messages as read as soon as the chat opens.
  // This clears the unread badge on the chat list for this group.
  useEffect(() => {
    if (isMember && user?.id && groupId) {
      markAsReadMutation.mutate({ groupId, userId: user.id });
    }
  }, [groupId, isMember, user?.id]);

  // Scroll to the bottom on initial data load so most recent messages are visible
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, [messages.length]);

  // Determines avatar and username visibility for consecutive messages.
  // Groups messages from the same sender — only the last shows the avatar
  // and only the first shows the username, matching WhatsApp and Slack behaviour.
  const getMessageDisplay = useCallback(
    (index: number) => {
      const current = messages[index];
      const next = messages[index + 1];
      const prev = messages[index - 1];
      const isMe = current.user.id === user?.id;
      return {
        // Show avatar on the last message in a consecutive group from the same sender
        showAvatar: !next || next.user.id !== current.user.id,
        // Show username on the first message from a new sender (not shown for own messages)
        showUsername: !isMe && (!prev || prev.user.id !== current.user.id),
      };
    },
    [messages, user?.id],
  );

  // Opens the device photo library so the user can pick an image to attach
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

  // Sends a message — clears the input immediately so the user can keep typing.
  // An optimistic placeholder appears instantly in the list (useSendMessage).
  // The real-time subscription and 3s polling both ensure other devices see it.
  const handleSend = useCallback(async () => {
    if ((!text.trim() && !selectedImage) || !isMember || !user?.id) return;

    const messageText = text.trim();
    const imageToSend = selectedImage;

    // Clear composer immediately — don't wait for the network request to complete
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
      // Scroll after successful send so sender sees their own message at the bottom
      scrollToBottom(true);
    } catch {
      Alert.alert("Error", "Failed to send message. Please try again.");
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

  // Confirmation alert before leaving — this is a destructive action
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

  // Overflow action sheet shown when the user taps the three-dot header icon
  const handleOptions = useCallback(() => {
    Alert.alert("Chat Options", "", [
      { text: "Leave Chat", onPress: handleLeaveChat, style: "destructive" },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleLeaveChat]);

  // Stable renderItem — wrapped in useCallback so the FlatList doesn't
  // re-render all message bubbles when the text input value changes
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

  // Stable key extractor — uses the real message id or the "optimistic-" temp id
  const keyExtractor = useCallback((item: GroupMessage) => item.id, []);

  // Non-members see the header and a join prompt — no message list shown
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
      {/* Header: back button, group name, overflow menu */}
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

      {/* Scrollable message list — oldest at top, newest at bottom */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.messagesList}
        // Scroll to bottom whenever the content height changes —
        // handles both new messages arriving and the keyboard appearing
        onContentSizeChange={() => scrollToBottom(false)}
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
        // Performance: unmount off-screen rows and limit render batch size
        removeClippedSubviews={true}
        maxToRenderPerBatch={20}
        windowSize={10}
        initialNumToRender={20}
        // Prevents the list from jumping when the keyboard opens on Android
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
      />

      {/* Reply preview bar — appears when user long-presses a message to reply */}
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

      {/* Image attachment preview — shown after user picks a photo */}
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

      {/* Message composer: image picker, text input, send button */}
      <View style={[styles.inputContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.inputWrapper}>
          {/* Attach image button */}
          <Pressable onPress={pickImage} style={styles.imageButton}>
            <Ionicons name="image-outline" size={24} color={COLORS.primary} />
          </Pressable>

          {/* Multi-line text input — grows up to maxHeight then scrolls */}
          <TextInput
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={text}
            onChangeText={setText}
            style={styles.input}
            multiline
            maxLength={1000}
          />

          {/* Send button — disabled when there is nothing to send */}
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
