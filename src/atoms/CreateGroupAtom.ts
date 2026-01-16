import { Group, GroupMember } from "@/src/types";
import { atom } from "jotai";
import { groupMembersAtom } from "./GroupMembersAtom";
import { groupsAtom } from "./GroupsAtom";

const CURRENT_USER_ID = "user-21";

export const createGroupAtom = atom(
  null,
  (get, set, payload: { name: string; image?: string }) => {
    const newGroup: Group = {
      id: `group-${Date.now()}`,
      name: payload.name,
      image: payload.image || "https://via.placeholder.com/80",
      leader_id: CURRENT_USER_ID,
    };

    const newMember: GroupMember = {
      id: `member-${Date.now()}`,
      group_id: newGroup.id,
      user_id: CURRENT_USER_ID,
      joined_at: new Date().toISOString(),
    };

    set(groupsAtom, (prev) => [newGroup, ...prev]);
    set(groupMembersAtom, (prev) => [newMember, ...prev]);

    return newGroup;
  }
);
