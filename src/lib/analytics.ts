import { ExpenseEntity } from "../types";
import { currencyLabel } from "./dates";

export function categoryTotals(expenses: ExpenseEntity[]) {
  return expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] ?? 0) + expense.amount;
    return acc;
  }, {});
}

export function monthlyTrend(expenses: ExpenseEntity[]) {
  return expenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.monthKey] = (acc[expense.monthKey] ?? 0) + expense.amount;
    return acc;
  }, {});
}

export function duplicateExpenseCandidates(expenses: ExpenseEntity[]) {
  const seen = new Map<string, ExpenseEntity>();
  const duplicates: ExpenseEntity[] = [];
  for (const expense of expenses) {
    const key = `${expense.groupId}-${expense.title.toLowerCase()}-${expense.amount.toFixed(2)}-${expense.expenseDate}`;
    const existing = seen.get(key);
    if (existing) {
      duplicates.push(expense);
    } else {
      seen.set(key, expense);
    }
  }
  return duplicates;
}

export function budgetUsage(expenses: ExpenseEntity[], budgetLimit: number) {
  const spent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return {
    spent,
    remaining: Number((budgetLimit - spent).toFixed(2)),
    percent: budgetLimit > 0 ? Math.min(100, Number(((spent / budgetLimit) * 100).toFixed(2))) : 0,
    label: currencyLabel(spent)
  };
}
