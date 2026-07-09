import { addDays, addMonths, format, parseISO, startOfMonth, subMonths } from "date-fns";
import type { RecurringRule, Transaction } from "./types";

export function advanceRecurringDate(date: Date, frequency: RecurringRule["frequency"]) {
  switch (frequency) {
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 14);
    case "monthly":
      return addMonths(date, 1);
    case "quarterly":
      return addMonths(date, 3);
    case "yearly":
      return addMonths(date, 12);
  }
}

export function retreatRecurringDate(date: Date, frequency: RecurringRule["frequency"]) {
  switch (frequency) {
    case "weekly":
      return addDays(date, -7);
    case "biweekly":
      return addDays(date, -14);
    case "monthly":
      return subMonths(date, 1);
    case "quarterly":
      return subMonths(date, 3);
    case "yearly":
      return subMonths(date, 12);
  }
}

// Catches a stale schedule up to the present: a monthly bill whose due date
// slipped into a past month resolves to this month's occurrence, and other
// frequencies resolve to the most recent occurrence not after the reference.
export function normalizedNextDueOn(rule: RecurringRule, referenceDate = new Date()) {
  let due = parseISO(rule.nextDueOn);

  if (rule.frequency === "monthly") {
    const monthStart = startOfMonth(referenceDate);
    while (due < monthStart) {
      due = addMonths(due, 1);
    }
  } else {
    while (advanceRecurringDate(due, rule.frequency) <= referenceDate) {
      due = advanceRecurringDate(due, rule.frequency);
    }
  }

  return format(due, "yyyy-MM-dd");
}

// Payments settle a cycle, identified by the cycle's due date: calendar month
// for monthly/quarterly/yearly bills, the exact due date for weekly/biweekly.
export function recurringCycleKey(frequency: RecurringRule["frequency"], dueOn: string) {
  return frequency === "weekly" || frequency === "biweekly" ? dueOn : dueOn.slice(0, 7);
}

// Which cycle a transaction pays for this rule, or undefined if unrelated.
// The explicit link is authoritative when it points at this rule (or at a
// deleted rule); a payment still owned by a *different, existing* rule is left
// to that rule. Otherwise fall back to identity matching (merchant + account +
// type), which covers payments recorded before links existed and bills that
// were deleted and recreated with a new id.
export function paidCycleDueOn(rule: RecurringRule, transaction: Transaction, liveRuleIds: Set<string>) {
  if (transaction.recurringRuleId === rule.id) {
    return transaction.recurringDueOn ?? transaction.occurredOn;
  }

  if (transaction.recurringRuleId && liveRuleIds.has(transaction.recurringRuleId)) {
    return undefined;
  }

  if (!transaction.isRecurring) {
    return undefined;
  }

  const cycleDueOn = recurringPaymentNoteDueOn(transaction.notes) ?? transaction.recurringDueOn;

  if (!cycleDueOn) {
    return undefined;
  }

  const sameIdentity =
    normalizeRecurringText(transaction.merchant) === normalizeRecurringText(rule.merchant) &&
    transaction.accountId === rule.accountId &&
    transaction.type === rule.type;

  return sameIdentity ? cycleDueOn : undefined;
}

export function findRecurringPayment(rule: RecurringRule, transactions: Transaction[], referenceDate = new Date(), liveRuleIds: Set<string> = new Set()) {
  // Monthly bills are scoped to the calendar month the payment was recorded in:
  // marking one paid covers that month and it resets on the 1st, regardless of
  // the exact due day. Keying on when the payment happened (not on a due-date
  // tag) means a payment made in one month never counts toward another.
  if (rule.frequency === "monthly") {
    const monthKey = format(referenceDate, "yyyy-MM");
    return transactions
      .filter((transaction) =>
        paidCycleDueOn(rule, transaction, liveRuleIds) !== undefined && transaction.occurredOn.startsWith(monthKey)
      )
      .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0];
  }

  const cycleKeys = new Set<string>();
  const due = parseISO(normalizedNextDueOn(rule, referenceDate));
  cycleKeys.add(recurringCycleKey(rule.frequency, format(due, "yyyy-MM-dd")));

  // A schedule sitting ahead of the reference means the previous cycle was
  // just settled (or paid early) — keep showing it as paid until its date passes.
  const previous = retreatRecurringDate(due, rule.frequency);
  if (previous > referenceDate) {
    cycleKeys.add(recurringCycleKey(rule.frequency, format(previous, "yyyy-MM-dd")));
  }

  return transactions
    .filter((transaction) => {
      const paidFor = paidCycleDueOn(rule, transaction, liveRuleIds);
      return paidFor !== undefined && cycleKeys.has(recurringCycleKey(rule.frequency, paidFor));
    })
    .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))[0];
}

const recurringPaymentNotePrefix = "Recorded from recurring item due ";

export function recurringPaymentNote(dueOn: string) {
  return `${recurringPaymentNotePrefix}${dueOn}`;
}

export function recurringPaymentNoteDueOn(notes?: string) {
  return notes?.startsWith(recurringPaymentNotePrefix) ? notes.slice(recurringPaymentNotePrefix.length) : undefined;
}

export function normalizeRecurringText(value?: string) {
  return (value ?? "").trim().toLowerCase();
}
