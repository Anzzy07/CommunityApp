import groupsData from "@/assets/data/groups.json";
import { Group } from "@/src/types";
import { atom } from "jotai";

// all communities
export const groupsAtom = atom<Group[]>(groupsData);
