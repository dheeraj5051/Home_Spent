import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { ExpenseEntity, GroupEntity, NotificationEntity, ReminderEntity, SettlementEntity, UserProfile } from "../types";
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient | null = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabase);
}

export interface SignUpPayload {
  username: string;
  fullName: string;
  email: string;
  password: string;
}

export async function signUpWithEmail(payload: SignUpPayload) {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        username: payload.username,
        full_name: payload.fullName
      }
    }
  });
}

export async function signInWithEmail(email: string, password: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: process.env.EXPO_PUBLIC_APP_SCHEME ? `${process.env.EXPO_PUBLIC_APP_SCHEME}://auth` : undefined
    }
  });
}

export async function sendPasswordReset(email: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.auth.resetPasswordForEmail(email);
}

export async function signOut() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.auth.signOut();
}

export async function deleteAccount(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.from("user_deletions").insert({ user_id: userId, deleted_at: new Date().toISOString() });
}

export async function upsertProfile(profile: Partial<UserProfile> & { id: string }) {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.from("profiles").upsert(profile, { onConflict: "id" });
}

export async function fetchProfile(userId: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.from("profiles").select("*").eq("id", userId).single();
}

export async function fetchGroups() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.from("groups").select("*").order("created_at", { ascending: false });
}

export async function fetchExpenses(groupId?: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const query = supabase.from("expenses").select("*").order("created_at", { ascending: false });
  return groupId ? query.eq("group_id", groupId) : query;
}

export async function fetchReminders() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.from("reminders").select("*").order("reminder_at", { ascending: true });
}

export async function fetchNotifications() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.from("notifications").select("*").order("created_at", { ascending: false });
}

export async function fetchSettlements(groupId?: string) {
  if (!supabase) throw new Error("Supabase is not configured");
  const query = supabase.from("settlements").select("*").order("created_at", { ascending: false });
  return groupId ? query.eq("group_id", groupId) : query;
}

export async function uploadStorageFile(bucket: string, path: string, file: Blob | File) {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase.storage.from(bucket).upload(path, file, { upsert: true });
}

export async function subscribeToGroupUpdates(groupId: string, callback: () => void) {
  if (!supabase) return null;
  const channel = supabase
    .channel(`group-${groupId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "expenses", filter: `group_id=eq.${groupId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "settlements", filter: `group_id=eq.${groupId}` }, callback)
    .on("postgres_changes", { event: "*", schema: "public", table: "reminders", filter: `group_id=eq.${groupId}` }, callback)
    .subscribe();
  return channel;
}

export function mapAuthUserToProfile(user: User): Partial<UserProfile> {
  return {
    id: user.id,
    username: String(user.user_metadata?.username ?? ""),
    fullName: String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? ""),
    email: user.email ?? "",
    joinedAt: user.created_at ?? new Date().toISOString()
  };
}

export async function upsertGroup(group: GroupEntity) {
  if (!supabase) return null;
  return supabase.from("groups").upsert({
    id: group.id, group_id: group.groupId, name: group.name,
    description: group.description, currency: group.currency,
    month: group.month, year: group.year, budget_limit: group.budgetLimit,
    category: group.category, owner_id: group.ownerId,
  }, { onConflict: "id" });
}

export async function upsertExpense(expense: ExpenseEntity) {
  if (!supabase) return null;
  return supabase.from("expenses").upsert({
    id: expense.id, group_id: expense.groupId, title: expense.title,
    description: expense.description, amount: expense.amount,
    payer_id: expense.payerId, split_method: expense.splitMethod,
    category: expense.category, tags: expense.tags, notes: expense.notes,
    expense_date: expense.expenseDate, status: expense.status,
    created_by: expense.createdBy, month_key: expense.monthKey,
  }, { onConflict: "id" });
}
