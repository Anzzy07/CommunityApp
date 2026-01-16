import groupMembersData from "@/assets/data/groupMembers.json";
import { GroupMember } from "@/src/types";
import { atom } from "jotai";

export const groupMembersAtom = atom<GroupMember[]>(groupMembersData);
