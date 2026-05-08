import { createSupabaseBrowserClient } from "./supabase";
import type { Account, Category, Goal, RecurringRule, Subcategory, Transaction, TransactionType } from "./types";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export type ExpenseData = {
  accounts: Account[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  goals: Goal[];
};

export type NewTransactionInput = {
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  type: TransactionType;
  amount: number;
  occurredOn: string;
  merchant?: string;
  notes?: string;
};

export type NewCategoryInput = {
  name: string;
  kind: TransactionType;
  monthlyBudget?: number;
};

export type NewSubcategoryInput = {
  categoryId: string;
  name: string;
};

export type NewRecurringRuleInput = {
  accountId: string;
  categoryId?: string;
  type: TransactionType;
  amount: number;
  merchant: string;
  frequency: RecurringRule["frequency"];
  nextDueOn: string;
  autoCreate: boolean;
};

export type NewGoalInput = {
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
};

export async function fetchExpenseData(): Promise<ExpenseData> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  }

  const [accountsResult, categoriesResult, subcategoriesResult, transactionsResult, recurringResult, goalsResult] = await Promise.all([
    supabase.from("accounts").select("*").eq("archived", false).order("created_at", { ascending: true }),
    supabase.from("categories").select("*").eq("archived", false).order("name", { ascending: true }),
    supabase.from("subcategories").select("*").eq("archived", false).order("name", { ascending: true }),
    supabase.from("transactions").select("*").order("occurred_on", { ascending: false }),
    supabase.from("recurring_rules").select("*").eq("active", true).order("next_due_on", { ascending: true }),
    supabase.from("goals").select("*").eq("archived", false).order("target_date", { ascending: true })
  ]);

  const firstError =
    accountsResult.error ??
    categoriesResult.error ??
    subcategoriesResult.error ??
    transactionsResult.error ??
    recurringResult.error ??
    goalsResult.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  return {
    accounts: (accountsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      openingBalance: Number(row.opening_balance),
      color: row.color
    })),
    categories: (categoriesResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      icon: row.icon,
      color: row.color,
      monthlyBudget: row.monthly_budget === null ? undefined : Number(row.monthly_budget)
    })),
    subcategories: (subcategoriesResult.data ?? []).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      name: row.name
    })),
    transactions: (transactionsResult.data ?? []).map((row) => ({
      id: row.id,
      accountId: row.account_id,
      categoryId: row.category_id ?? undefined,
      subcategoryId: row.subcategory_id ?? undefined,
      type: row.type,
      amount: Number(row.amount),
      occurredOn: row.occurred_on,
      merchant: row.merchant,
      notes: row.notes,
      isRecurring: row.is_recurring
    })),
    recurringRules: (recurringResult.data ?? []).map((row) => ({
      id: row.id,
      accountId: row.account_id,
      categoryId: row.category_id ?? undefined,
      type: row.type,
      amount: Number(row.amount),
      merchant: row.merchant,
      frequency: row.frequency,
      nextDueOn: row.next_due_on,
      autoCreate: row.auto_create
    })),
    goals: (goalsResult.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      targetAmount: Number(row.target_amount),
      currentAmount: Number(row.current_amount),
      targetDate: row.target_date,
      color: row.color
    }))
  };
}

export async function createTransaction(input: NewTransactionInput): Promise<Transaction> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .insert({
      user_id: DEMO_USER_ID,
      account_id: input.accountId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      type: input.type,
      amount: input.amount,
      occurred_on: input.occurredOn,
      merchant: input.merchant ?? "",
      notes: input.notes ?? ""
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    accountId: data.account_id,
    categoryId: data.category_id ?? undefined,
    subcategoryId: data.subcategory_id ?? undefined,
    type: data.type,
    amount: Number(data.amount),
    occurredOn: data.occurred_on,
    merchant: data.merchant,
    notes: data.notes,
    isRecurring: data.is_recurring
  };
}

export async function createCategory(input: NewCategoryInput): Promise<Category> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      user_id: DEMO_USER_ID,
      name: input.name,
      kind: input.kind,
      monthly_budget: input.kind === "expense" ? input.monthlyBudget ?? null : null
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    kind: data.kind,
    icon: data.icon,
    color: data.color,
    monthlyBudget: data.monthly_budget === null ? undefined : Number(data.monthly_budget)
  };
}

export async function createSubcategory(input: NewSubcategoryInput): Promise<Subcategory> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("subcategories")
    .insert({
      user_id: DEMO_USER_ID,
      category_id: input.categoryId,
      name: input.name
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    categoryId: data.category_id,
    name: data.name
  };
}

export async function updateCategoryBudget(categoryId: string, monthlyBudget: number | null): Promise<Category> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("categories")
    .update({ monthly_budget: monthlyBudget })
    .eq("id", categoryId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    kind: data.kind,
    icon: data.icon,
    color: data.color,
    monthlyBudget: data.monthly_budget === null ? undefined : Number(data.monthly_budget)
  };
}

export async function createRecurringRule(input: NewRecurringRuleInput): Promise<RecurringRule> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("recurring_rules")
    .insert({
      user_id: DEMO_USER_ID,
      account_id: input.accountId,
      category_id: input.categoryId,
      type: input.type,
      amount: input.amount,
      merchant: input.merchant,
      frequency: input.frequency,
      next_due_on: input.nextDueOn,
      auto_create: input.autoCreate
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    accountId: data.account_id,
    categoryId: data.category_id ?? undefined,
    type: data.type,
    amount: Number(data.amount),
    merchant: data.merchant,
    frequency: data.frequency,
    nextDueOn: data.next_due_on,
    autoCreate: data.auto_create
  };
}

export async function createGoal(input: NewGoalInput): Promise<Goal> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("goals")
    .insert({
      user_id: DEMO_USER_ID,
      name: input.name,
      target_amount: input.targetAmount,
      current_amount: input.currentAmount,
      target_date: input.targetDate || null
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    targetAmount: Number(data.target_amount),
    currentAmount: Number(data.current_amount),
    targetDate: data.target_date,
    color: data.color
  };
}

export async function updateGoalProgress(goalId: string, currentAmount: number): Promise<Goal> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("goals")
    .update({ current_amount: currentAmount })
    .eq("id", goalId)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    targetAmount: Number(data.target_amount),
    currentAmount: Number(data.current_amount),
    targetDate: data.target_date,
    color: data.color
  };
}

export async function removeTransaction(id: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
