import { Notification } from "@/src/types";
import { scheduleNotification } from "./notificationService";

// Build an in-memory Notification object with a temporary random id.
// This is used for optimistic UI updates before the real database record is created.
export const createNotification = (
  type: Notification["type"],
  message: string,
  userId: string,
  referenceId: string,
): Notification => {
  return {
    id: Math.random().toString(),
    user_id: userId,
    type,
    message,
    reference_id: referenceId,
    is_read: false,
    created_at: new Date().toISOString(),
  };
};

// Create a notification object, optionally add it to local state for immediate display,
// then fire the corresponding push notification through the device notification system.
export const sendNotification = async (
  type: Notification["type"],
  title: string,
  message: string,
  userId: string,
  referenceId: string,
  addToState?: (notification: Notification) => void,
) => {
  const notification = createNotification(type, message, userId, referenceId);

  // Update the UI immediately without waiting for a database round-trip
  if (addToState) {
    addToState(notification);
  }

  // Deliver the push notification — addToInbox: true tells the foreground
  // listener in _layout.tsx to persist this notification to Supabase
  await scheduleNotification(title, message, {
    type,
    referenceId,
    notificationId: notification.id,
    addToInbox: true,
  } as any);

  return notification;
};

// Notify the post author that someone has left a comment on their post
export const notifyNewComment = async (
  commenterName: string,
  postId: string,
  userId: string,
  addToState?: (notification: Notification) => void,
) => {
  return sendNotification(
    "comment",
    "New Comment",
    `${commenterName} commented on your post`,
    userId,
    postId,
    addToState,
  );
};

// Notify community members that a new post has been published in their community
export const notifyNewPost = async (
  communityName: string,
  postId: string,
  userId: string,
  addToState?: (notification: Notification) => void,
) => {
  return sendNotification(
    "post",
    "New Post",
    `New post in ${communityName}`,
    userId,
    postId,
    addToState,
  );
};

// Notify community members that a new poll is available for them to vote on
export const notifyNewPoll = async (
  pollQuestion: string,
  pollId: string,
  userId: string,
  addToState?: (notification: Notification) => void,
) => {
  return sendNotification(
    "poll",
    "New Poll",
    `New poll: ${pollQuestion}`,
    userId,
    pollId,
    addToState,
  );
};

// Notify community members that a new challenge has been posted
export const notifyNewChallenge = async (
  challengeTitle: string,
  challengeId: string,
  userId: string,
  addToState?: (notification: Notification) => void,
) => {
  return sendNotification(
    "challenge",
    "New Challenge",
    `New challenge: ${challengeTitle}`,
    userId,
    challengeId,
    addToState,
  );
};

// Notify the recipient that they have received a new message in a group chat
export const notifyNewMessage = async (
  senderName: string,
  groupId: string,
  userId: string,
  addToState?: (notification: Notification) => void,
) => {
  return sendNotification(
    "message",
    "New Message",
    `${senderName} sent you a message`,
    userId,
    groupId,
    addToState,
  );
};
