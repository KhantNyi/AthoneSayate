export type TransactionType = "income" | "expense";

export type AccountType =
  | "cash"
  | "checking"
  | "savings"
  | "credit_card"
  | "wallet"
  | "investment";

export type Category = {
  id: string;
  name: string;
  kind: TransactionType;
  icon: string;
  color: string;
  monthlyBudget?: number;
};

export type Subcategory = {
  id: string;
  categoryId: string;
  name: string;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
};

export type Transaction = {
  id: string;
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  type: TransactionType;
  amount: number;
  occurredOn: string;
  merchant?: string;
  notes?: string;
  isRecurring?: boolean;
};

export type RecurringRule = {
  id: string;
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  merchant: string;
  frequency: "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly";
  nextDueOn: string;
  autoCreate: boolean;
};

export type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  color: string;
};
