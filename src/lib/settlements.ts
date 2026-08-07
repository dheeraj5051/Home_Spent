import { ExpenseEntity, ExpenseSplit, GroupEntity, MemberSummary, SplitMethod } from "../types";
import { monthKey } from "./dates";

export function calculateSplits(
  amount: number,
  method: SplitMethod,
  members: Array<{ userId: string; value?: number }>
): ExpenseSplit[] {
  if (members.length === 0) return [];

  if (method === "percentage") {
    return members.map((member) => ({ userId: member.userId, value: Number(((amount * Number(member.value ?? 0)) / 100).toFixed(2)) }));
  }

  if (method === "custom" || method === "exact") {
    return members.map((member) => ({ userId: member.userId, value: Number((member.value ?? 0).toFixed(2)) }));
  }

  if (method === "weighted") {
    const totalWeight = members.reduce((sum, member) => sum + Number(member.value ?? 1), 0) || members.length;
    return members.map((member) => ({
      userId: member.userId,
      value: Number(((amount * Number(member.value ?? 1)) / totalWeight).toFixed(2))
    }));
  }

  const equalShare = Number((amount / members.length).toFixed(2));
  return members.map((member, index) => ({
    userId: member.userId,
    value: index === members.length - 1 ? Number((amount - equalShare * (members.length - 1)).toFixed(2)) : equalShare
  }));
}

export function buildBalanceSheet(expenses: ExpenseEntity[], members: MemberSummary[]) {
  const totalPaid = new Map<string, number>();
  const totalOwed = new Map<string, number>();

  for (const member of members) {
    totalPaid.set(member.userId, 0);
    totalOwed.set(member.userId, 0);
  }

  for (const expense of expenses.filter((item) => item.status === "active")) {
    totalPaid.set(expense.payerId, (totalPaid.get(expense.payerId) ?? 0) + expense.amount);
    for (const split of expense.splits) {
      totalOwed.set(split.userId, (totalOwed.get(split.userId) ?? 0) + split.value);
    }
  }

  return members.map((member) => {
    const paid = totalPaid.get(member.userId) ?? 0;
    const owed = totalOwed.get(member.userId) ?? 0;
    const receivable = Number((paid - owed).toFixed(2));
    return {
      ...member,
      paid: Number(paid.toFixed(2)),
      owed: Number(owed.toFixed(2)),
      receivable
    };
  });
}

export function settlementSummary(expense: ExpenseEntity, payerName: string, splitNames: string[]): string {
  const amount = expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const splits = splitNames.map((name) => `${name} owes ₹${(expense.amount / Math.max(splitNames.length, 1)).toFixed(0)}`).join(", ");
  return `${payerName} paid ₹${amount}, ${splits}`;
}

export function currentMonthFilter(expenses: ExpenseEntity[], month = monthKey()) {
  return expenses.filter((expense) => expense.monthKey === month && expense.status === "active");
}

export function groupTotalsByCategory(expenses: ExpenseEntity[]) {
  return expenses.reduce<Record<string, number>>((acc, expense) => {
    const current = acc[expense.category] ?? 0;
    acc[expense.category] = Number((current + expense.amount).toFixed(2));
    return acc;
  }, {});
}
