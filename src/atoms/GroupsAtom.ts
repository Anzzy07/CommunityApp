import { Group } from "@/src/types";
import { atom } from "jotai";

export const groupsAtom = atom<Group[]>([]); // start empty
