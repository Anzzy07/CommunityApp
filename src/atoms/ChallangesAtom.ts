import { Challenge } from "@/src/types";
import { atom } from "jotai";

export const challengesAtom = atom<Challenge[]>([]);
