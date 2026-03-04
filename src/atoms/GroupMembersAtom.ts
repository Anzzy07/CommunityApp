import { GroupMember } from "@/src/types";
import { atom } from "jotai";

export const groupMembersAtom = atom<GroupMember[]>([]); // start empty
