import { Notification } from "@/src/types";
import { scheduleNotification } from "./notificationService";

// Create a notification object for the state
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

// Send a push notification AND add to state
export const sendNotification = async (
  type: Notification["type"],
  title: string,
  message: string,
  userId: string,
  referenceId: string,
  addToState?: (notification: Notification) => void,
) => {
  // Create notification object
  const notification = createNotification(type, message, userId, referenceId);

  // Add to state if callback provided
  if (addToState) {
    addToState(notification);
  }

  // Send push notification
  await scheduleNotification(title, message, {
    type,
    referenceId,
    notificationId: notification.id,
    addToInbox: true,
  } as any);

  return notification;
};

// Helper functions for common notification types

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
