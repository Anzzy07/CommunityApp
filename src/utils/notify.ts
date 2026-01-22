import { Notification } from "@/src/types";

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
