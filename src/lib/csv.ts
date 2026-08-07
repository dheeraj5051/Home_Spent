import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ExpenseEntity, GroupEntity, UserProfile } from "../types";
import { dateLabel, timeLabel } from "./dates";

export function buildCsv(expenses: ExpenseEntity[], group?: GroupEntity | null): string {
  const header = ["groupId", "title", "amount", "payerId", "category", "date", "time", "status", "tags"].join(",");
  const rows = expenses.map((expense) => [
    group?.groupId ?? expense.groupId,
    expense.title,
    expense.amount.toFixed(2),
    expense.payerId,
    expense.category,
    dateLabel(expense.expenseDate),
    timeLabel(expense.expenseDate),
    expense.status,
    expense.tags.join("|")
  ].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","));
  return [header, ...rows].join("\n");
}

export async function exportCsv(expenses: ExpenseEntity[], group?: GroupEntity | null): Promise<string | null> {
  if (!FileSystem.documentDirectory) return null;
  const csv = buildCsv(expenses, group);
  const fileUri = `${FileSystem.documentDirectory}splitnest-report.csv`;
  await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
  return fileUri;
}

export async function shareCsv(fileUri: string): Promise<void> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri);
  }
}

export function buildProfileCsv(profile: UserProfile): string {
  return [
    "field,value",
    `"username","${profile.username}"`,
    `"fullName","${profile.fullName}"`,
    `"email","${profile.email}"`,
    `"groupsJoined","${profile.groupsJoined}"`,
    `"groupsCreated","${profile.groupsCreated}"`,
    `"totalPaid","${profile.totalPaid.toFixed(2)}"`,
    `"totalOwed","${profile.totalOwed.toFixed(2)}"`,
    `"totalReceivable","${profile.totalReceivable.toFixed(2)}"`
  ].join("\n");
}
