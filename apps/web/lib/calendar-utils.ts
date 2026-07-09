import { eachDayOfInterval, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";
import type { RecurringRule, Transaction } from "@athonesayate/shared/types";

export type CalendarDaySummary = {
  income?: number;
  expense?: number;
  count?: number;
  dueAmount?: number;
  recurringCount?: number;
  paidAmount?: number;
  paidRecurringCount?: number;
};

export function buildCalendarGrid(month: Date) {
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(month)),
    end: endOfWeek(endOfMonth(month))
  });
}

export function summarizeTransactionsByDay(transactions: Transaction[]) {
  return transactions.reduce<Record<string, CalendarDaySummary>>((summary, transaction) => {
    const current = summary[transaction.occurredOn] ?? {};

    summary[transaction.occurredOn] = {
      ...current,
      count: (current.count ?? 0) + 1,
      income: (current.income ?? 0) + (transaction.type === "income" ? transaction.amount : 0),
      expense: (current.expense ?? 0) + (transaction.type === "expense" ? transaction.amount : 0)
    };

    return summary;
  }, {});
}

export function summarizeRecurringByDay(rules: RecurringRule[]) {
  return rules.reduce<Record<string, CalendarDaySummary>>((summary, rule) => {
    const current = summary[rule.nextDueOn] ?? {};

    summary[rule.nextDueOn] = {
      ...current,
      recurringCount: (current.recurringCount ?? 0) + 1,
      dueAmount: (current.dueAmount ?? 0) + (rule.type === "expense" ? rule.amount : 0)
    };

    return summary;
  }, {});
}

export function summarizeRecurringCalendarByDay(rules: RecurringRule[], transactions: Transaction[], paymentsByRule: Record<string, Transaction | undefined>, monthKey: string) {
  const paidTransactions = new Map<string, Transaction>();
  const paidRuleIds = new Set<string>();

  Object.entries(paymentsByRule).forEach(([ruleId, transaction]) => {
    if (!transaction) {
      return;
    }

    paidRuleIds.add(ruleId);

    if (transaction.occurredOn.startsWith(monthKey)) {
      paidTransactions.set(transaction.id, transaction);
    }
  });

  transactions
    .filter((transaction) => transaction.isRecurring && transaction.occurredOn.startsWith(monthKey))
    .forEach((transaction) => paidTransactions.set(transaction.id, transaction));

  const dueSummary = summarizeRecurringByDay(rules.filter((rule) => rule.nextDueOn.startsWith(monthKey) && !paidRuleIds.has(rule.id)));
  const paidSummary = Array.from(paidTransactions.values()).reduce<Record<string, CalendarDaySummary>>((summary, transaction) => {
    const current = summary[transaction.occurredOn] ?? {};

    summary[transaction.occurredOn] = {
      ...current,
      paidAmount: (current.paidAmount ?? 0) + transaction.amount,
      paidRecurringCount: (current.paidRecurringCount ?? 0) + 1
    };

    return summary;
  }, {});

  return mergeCalendarSummaries(dueSummary, paidSummary);
}

export function summarizeActivityRange(transactions: Transaction[], rules: RecurringRule[], start: Date, end: Date): Required<CalendarDaySummary> {
  const startKey = format(start, "yyyy-MM-dd");
  const endKey = format(end, "yyyy-MM-dd");

  const transactionSummary = transactions
    .filter((transaction) => transaction.occurredOn >= startKey && transaction.occurredOn <= endKey)
    .reduce<Required<CalendarDaySummary>>((summary, transaction) => ({
      ...summary,
      count: summary.count + 1,
      income: summary.income + (transaction.type === "income" ? transaction.amount : 0),
      expense: summary.expense + (transaction.type === "expense" ? transaction.amount : 0)
    }), emptyCalendarSummary());

  return rules
    .filter((rule) => rule.nextDueOn >= startKey && rule.nextDueOn <= endKey)
    .reduce<Required<CalendarDaySummary>>((summary, rule) => ({
      ...summary,
      dueAmount: summary.dueAmount + (rule.type === "expense" ? rule.amount : 0),
      recurringCount: summary.recurringCount + 1
    }), transactionSummary);
}

export function mergeCalendarSummaries(...summaries: Record<string, CalendarDaySummary>[]) {
  return summaries.reduce<Record<string, CalendarDaySummary>>((merged, summary) => {
    Object.entries(summary).forEach(([date, value]) => {
      const current = merged[date] ?? {};
      merged[date] = {
        income: (current.income ?? 0) + (value.income ?? 0),
        expense: (current.expense ?? 0) + (value.expense ?? 0),
        count: (current.count ?? 0) + (value.count ?? 0),
        dueAmount: (current.dueAmount ?? 0) + (value.dueAmount ?? 0),
        recurringCount: (current.recurringCount ?? 0) + (value.recurringCount ?? 0),
        paidAmount: (current.paidAmount ?? 0) + (value.paidAmount ?? 0),
        paidRecurringCount: (current.paidRecurringCount ?? 0) + (value.paidRecurringCount ?? 0)
      };
    });

    return merged;
  }, {});
}

export function emptyCalendarSummary(): Required<CalendarDaySummary> {
  return {
    income: 0,
    expense: 0,
    count: 0,
    dueAmount: 0,
    recurringCount: 0,
    paidAmount: 0,
    paidRecurringCount: 0
  };
}
