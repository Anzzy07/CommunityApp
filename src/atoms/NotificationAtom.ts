import { Notification } from "@/src/types";
import { atom } from "jotai";

// Starts empty — hydrated from Supabase in _layout.tsx
export const notificationsAtom = atom<Notification[]>([]);

// Derived: unread count
export const unreadNotificationsCountAtom = atom((get) => {
  return get(notificationsAtom).filter((n) => !n.is_read).length;
});
