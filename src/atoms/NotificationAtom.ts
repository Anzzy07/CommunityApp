import { Notification } from "@/src/types";
import { atom } from "jotai";

// dummy notifications
export const notificationsAtom = atom<Notification[]>([
  {
    id: "n1",
    user_id: "user-21",
    type: "comment",
    reference_id: "post-1",
    message: "Alex commented on your post",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "n2",
    user_id: "user-21",
    type: "challenge",
    reference_id: "challenge-1",
    message: "New fitness challenge started",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "n3",
    user_id: "user-21",
    type: "message",
    reference_id: "group-1",
    message: "New message in Fitness community",
    is_read: true,
    created_at: new Date().toISOString(),
  },
]);

// derived unread count
export const unreadNotificationsCountAtom = atom((get) => {
  const notifications = get(notificationsAtom);
  return notifications.filter((n) => !n.is_read).length;
});
