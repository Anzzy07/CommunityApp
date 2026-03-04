import { supabase } from "@/src/lib/supabase";
import { Group, GroupMember } from "@/src/types";
import { atom } from "jotai";
import { groupMembersAtom } from "./GroupMembersAtom";
import { groupsAtom } from "./GroupsAtom";

export const createGroupAtom = atom(
  null,
  async (
    get,
    set,
    payload: { name: string; image?: string; userId: string },
  ) => {
    // Insert into Supabase
    const { data: newGroup, error: groupError } = await supabase
      .from("groups")
      .insert({
        name: payload.name,
        image: payload.image || null,
        leader_id: payload.userId,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Add creator as member
    const { data: newMember, error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: newGroup.id,
        user_id: payload.userId,
      })
      .select()
      .single();

    if (memberError) throw memberError;

    const group: Group = {
      id: newGroup.id,
      name: newGroup.name,
      image: newGroup.image ?? "",
      leader_id: newGroup.leader_id,
      description: newGroup.description ?? null,
    };

    const member: GroupMember = {
      id: newMember.id,
      group_id: newMember.group_id,
      user_id: newMember.user_id,
      joined_at: newMember.joined_at ?? new Date().toISOString(),
    };

    // Update Jotai atoms
    set(groupsAtom, (prev) => [group, ...prev]);
    set(groupMembersAtom, (prev) => [member, ...prev]);

    return group;
  },
);
