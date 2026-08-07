import NetInfo from "@react-native-community/netinfo";
import { supabase } from "./supabase";
import { getLastSyncAt, readCache, readQueue, setLastSyncAt, writeCache, writeQueue } from "./storage";
import { ExpenseEntity, GroupEntity, NotificationEntity, ReminderEntity, SettlementEntity, UserProfile } from "../types";

export interface SplitNestCache {
  profile: UserProfile | null;
  groups: GroupEntity[];
  expenses: ExpenseEntity[];
  settlements: SettlementEntity[];
  reminders: ReminderEntity[];
  notifications: NotificationEntity[];
}

export const emptyCache: SplitNestCache = {
  profile: null,
  groups: [],
  expenses: [],
  settlements: [],
  reminders: [],
  notifications: []
};

export async function loadCachedState() {
  return readCache<SplitNestCache>(emptyCache);
}

export async function saveCachedState(state: SplitNestCache) {
  await writeCache(state);
}

export async function queueMutation(payload: Record<string, unknown>) {
  const queue = await readQueue<Record<string, unknown>[]>([]);
  queue.push(payload);
  await writeQueue(queue);
}

export async function flushQueue() {
  if (!supabase) return;
  const queue = await readQueue<Record<string, unknown>[]>([]);
  if (!queue.length) return;
  for (const mutation of queue) {
    await supabase.from(String(mutation.table)).upsert(mutation.values as Record<string, unknown> | Record<string, unknown>[], mutation.options as never);
  }
  await writeQueue([]);
}

export async function syncNow(groupId?: string) {
  if (!supabase) return null;
  const isOnline = await NetInfo.fetch().then((state) => Boolean(state.isConnected && state.isInternetReachable !== false));
  if (!isOnline) return null;

  const lastSyncAt = await getLastSyncAt();
  const state = await loadCachedState();

  const [profileResult, groupResult, expenseResult, settlementResult, reminderResult, notificationResult] = await Promise.all([
    state.profile?.id ? supabase.from("profiles").select("*").eq("id", state.profile.id).single() : Promise.resolve({ data: null }),
    supabase.from("groups").select("*").order("created_at", { ascending: false }),
    groupId ? supabase.from("expenses").select("*").eq("group_id", groupId).order("created_at", { ascending: false }) : supabase.from("expenses").select("*").order("created_at", { ascending: false }),
    groupId ? supabase.from("settlements").select("*").eq("group_id", groupId).order("created_at", { ascending: false }) : supabase.from("settlements").select("*").order("created_at", { ascending: false }),
    groupId ? supabase.from("reminders").select("*").eq("group_id", groupId).order("reminder_at", { ascending: true }) : supabase.from("reminders").select("*").order("reminder_at", { ascending: true }),
    supabase.from("notifications").select("*").order("created_at", { ascending: false })
  ]);

  const nextState: SplitNestCache = {
    profile: (profileResult as { data?: UserProfile | null }).data ?? state.profile,
    groups: (groupResult.data ?? []) as GroupEntity[],
    expenses: (expenseResult.data ?? []) as ExpenseEntity[],
    settlements: (settlementResult.data ?? []) as SettlementEntity[],
    reminders: (reminderResult.data ?? []) as ReminderEntity[],
    notifications: (notificationResult.data ?? []) as NotificationEntity[]
  };

  await saveCachedState(nextState);
  await setLastSyncAt(new Date().toISOString());
  return { nextState, lastSyncAt };
}

export async function getSyncStamp() {
  return getLastSyncAt();
}
