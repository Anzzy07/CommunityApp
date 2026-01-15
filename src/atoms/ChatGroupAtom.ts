import { Group } from "@/src/types";
import { atom } from "jotai";

// currently active chat group
export const chatGroupAtom = atom<Group | null>(null);
