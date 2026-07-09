import type { Account, AccountType, Goal, RecurringRule, Transaction, TransactionType } from "@athonesayate/shared/types";

export type RecurringDraft = {
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  type: TransactionType;
  amount: string;
  merchant: string;
  frequency: RecurringRule["frequency"];
  nextDueOn: string;
  autoCreate: boolean;
};

export type GoalDraft = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
};

export type TransactionDraft = {
  accountId: string;
  categoryId: string;
  subcategoryId: string;
  type: TransactionType;
  amount: string;
  occurredOn: string;
  notes: string;
};

export type AccountDraft = {
  name: string;
  type: AccountType;
  openingBalance: string;
  color: string;
};

export function recurringRuleToDraft(rule: RecurringRule): RecurringDraft {
  return {
    accountId: rule.accountId,
    categoryId: rule.categoryId ?? "",
    subcategoryId: rule.subcategoryId ?? "",
    type: rule.type,
    amount: String(rule.amount),
    merchant: rule.merchant,
    frequency: rule.frequency,
    nextDueOn: rule.nextDueOn,
    autoCreate: rule.autoCreate
  };
}

export function transactionToDraft(transaction: Transaction): TransactionDraft {
  return {
    accountId: transaction.accountId,
    categoryId: transaction.categoryId ?? "",
    subcategoryId: transaction.subcategoryId ?? "",
    type: transaction.type,
    amount: String(transaction.amount),
    occurredOn: transaction.occurredOn,
    notes: transaction.notes ?? ""
  };
}

export function goalToDraft(goal: Goal): GoalDraft {
  return {
    name: goal.name,
    targetAmount: String(goal.targetAmount),
    currentAmount: String(goal.currentAmount),
    targetDate: goal.targetDate ?? ""
  };
}

export function accountToDraft(account: Account): AccountDraft {
  return {
    name: account.name,
    type: account.type,
    openingBalance: String(account.openingBalance),
    color: account.color
  };
}
