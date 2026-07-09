import { createSupabaseBrowserClient } from "./supabase";
import type { Account, AccountType, Budget, Category, Goal, RecurringRule, Subcategory, Transaction, TransactionType } from "./types";

export const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

export type ExpenseData = {
  accounts: Account[];
  budgets: Budget[];
  categories: Category[];
  subcategories: Subcategory[];
  transactions: Transaction[];
  recurringRules: RecurringRule[];
  goals: Goal[];
};

export type UpdateAccountInput = {
  name: string;
  type: AccountType;
  openingBalance: number;
  color: string;
};

export type NewTransactionInput = {
  /** Client-generated UUID so offline-queued creates keep the same id after replay. */
  id?: string;
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  type: TransactionType;
  amount: number;
  occurredOn: string;
  merchant?: string;
  notes?: string;
  isRecurring?: boolean;
  recurringRuleId?: string;
  recurringDueOn?: string;
};

export type UpdateTransactionInput = NewTransactionInput;

export type NewCategoryInput = {
  id?: string;
  name: string;
  kind: TransactionType;
  monthlyBudget?: number;
};

export type UpdateCategoryInput = NewCategoryInput;

export type NewSubcategoryInput = {
  id?: string;
  categoryId: string;
  name: string;
};

export type NewRecurringRuleInput = {
  id?: string;
  accountId: string;
  categoryId?: string;
  subcategoryId?: string;
  type: TransactionType;
  amount: number;
  merchant: string;
  frequency: RecurringRule["frequency"];
  nextDueOn: string;
  autoCreate: boolean;
};

export type UpdateRecurringRuleInput = NewRecurringRuleInput;

export type NewGoalInput = {
  id?: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
};

export type UpdateGoalInput = NewGoalInput;

export type MonthlyBudgetInput = {
  categoryId: string;
  month: string;
  amount: number;
};

type RecurringRulePayload = {
  id?: string;
  user_id?: string;
  account_id: string;
  category_id?: string;
  subcategory_id?: string | null;
  type: TransactionType;
  amount: number;
  merchant: string;
  frequency: RecurringRule["frequency"];
  next_due_on: string;
  auto_create: boolean;
};

type RecurringRuleRow = {
  id: string;
  account_id: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  type: TransactionType;
  amount: number | string;
  merchant: string;
  frequency: RecurringRule["frequency"];
  next_due_on: string;
  auto_create: boolean;
};

function recurringRulePayload(input: NewRecurringRuleInput, options: { includeUser?: boolean; includeSubcategory?: boolean } = {}): RecurringRulePayload {
  const payload: RecurringRulePayload = {
    ...(input.id && options.includeUser ? { id: input.id } : {}),
    account_id: input.accountId,
    category_id: input.categoryId,
    type: input.type,
    amount: input.amount,
    merchant: input.merchant,
    frequency: input.frequency,
    next_due_on: input.nextDueOn,
    auto_create: input.autoCreate
  };

  if (options.includeUser) {
    payload.user_id = DEMO_USER_ID;
  }

  if (options.includeSubcategory) {
    payload.subcategory_id = input.subcategoryId ?? null;
  }

  return payload;
}

function isMissingRecurringSubcategoryError(error: { message?: string; details?: string } | null) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return text.includes("'subcategory_id'") && text.includes("'recurring_rules'");
}

function isMissingRecurringLinkError(error: { message?: string; details?: string } | null) {
  const text = `${error?.message ?? ""} ${error?.details ?? ""}`;
  return text.includes("recurring_rule_id") || text.includes("recurring_due_on");
}

function mapTransaction(data: Record<string, unknown> & { id: string }): Transaction {
  return {
    id: data.id,
    accountId: data.account_id as string,
    categoryId: (data.category_id as string | null) ?? undefined,
    subcategoryId: (data.subcategory_id as string | null) ?? undefined,
    type: data.type as TransactionType,
    amount: Number(data.amount),
    occurredOn: data.occurred_on as string,
    merchant: data.merchant as string | undefined,
    notes: data.notes as string | undefined,
    isRecurring: data.is_recurring as boolean | undefined,
    recurringRuleId: (data.recurring_rule_id as string | null | undefined) ?? undefined,
    recurringDueOn: (data.recurring_due_on as string | null | undefined) ?? undefined
  };
}

function mapRecurringRule(data: RecurringRuleRow): RecurringRule {
  return {
    id: data.id,
    accountId: data.account_id,
    categoryId: data.category_id ?? undefined,
    subcategoryId: data.subcategory_id ?? undefined,
    type: data.type,
    amount: Number(data.amount),
    merchant: data.merchant,
    frequency: data.frequency,
    nextDueOn: data.next_due_on,
    autoCreate: data.auto_create
  };
}

export async function fetchExpenseData(): Promise<ExpenseData> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
  }

  const [accountsResult, budgetsResult, categoriesResult, subcategoriesResult, transactionsResult, recurringResult, goalsResult] = await Promise.all([
    supabase.from("accounts").select("*").eq("archived", false).order("created_at", { ascending: true }),
    supabase.from("budgets").select("*").order("month", { ascending: false }),
    supabase.from("categories").select("*").eq("archived", false).order("name", { ascending: true }),
    supabase.from("subcategories").select("*").eq("archived", false).order("name", { ascending: true }),
    supabase.from("transactions").select("*").order("occurred_on", { ascending: false }),
    supabase.from("recurring_rules").select("*").eq("active", true).order("next_due_on", { ascending: true }),
    supabase.from("goals").select("*").eq("archived", false).order("target_date", { ascending: true })
  ]);

  const firstError =
    accountsResult.error ??
    budgetsResult.error ??
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
    budgets: (budgetsResult.data ?? []).map((row) => ({
      id: row.id,
      categoryId: row.category_id,
      month: row.month,
      amount: Number(row.amount)
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
    transactions: (transactionsResult.data ?? []).map(mapTransaction),
    recurringRules: (recurringResult.data ?? []).map((row) => ({
      id: row.id,
      accountId: row.account_id,
      categoryId: row.category_id ?? undefined,
      subcategoryId: row.subcategory_id ?? undefined,
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

  type TransactionPayload = {
    id?: string;
    user_id: string;
    account_id: string;
    category_id?: string;
    subcategory_id?: string;
    type: TransactionType;
    amount: number;
    occurred_on: string;
    merchant: string;
    notes: string;
    is_recurring: boolean;
    recurring_rule_id?: string;
    recurring_due_on?: string;
  };

  const basePayload: TransactionPayload = {
    ...(input.id ? { id: input.id } : {}),
    user_id: DEMO_USER_ID,
    account_id: input.accountId,
    category_id: input.categoryId,
    subcategory_id: input.subcategoryId,
    type: input.type,
    amount: input.amount,
    occurred_on: input.occurredOn,
    merchant: input.merchant ?? "",
    notes: input.notes ?? "",
    is_recurring: input.isRecurring ?? false
  };
  const linkedPayload: TransactionPayload = input.recurringRuleId
    ? { ...basePayload, recurring_rule_id: input.recurringRuleId, recurring_due_on: input.recurringDueOn }
    : basePayload;

  let { data, error } = await supabase
    .from("transactions")
    .insert(linkedPayload)
    .select("*")
    .single();

  // Databases that haven't run 005_recurring_payment_links.sql yet fall back
  // to the legacy note-based linkage.
  if (input.recurringRuleId && isMissingRecurringLinkError(error)) {
    ({ data, error } = await supabase.from("transactions").insert(basePayload).select("*").single());
  }

  if (error) {
    throw new Error(error.message);
  }

  return mapTransaction(data);
}

export async function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("transactions")
    .update({
      account_id: input.accountId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      type: input.type,
      amount: input.amount,
      occurred_on: input.occurredOn,
      merchant: input.merchant ?? "",
      notes: input.notes ?? ""
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapTransaction(data);
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<Account> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("accounts")
    .update({
      name: input.name,
      type: input.type,
      opening_balance: input.openingBalance,
      color: input.color
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    openingBalance: Number(data.opening_balance),
    color: data.color
  };
}

export async function archiveAccount(id: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("accounts").update({ archived: true }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createCategory(input: NewCategoryInput): Promise<Category> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      ...(input.id ? { id: input.id } : {}),
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

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("categories")
    .update({
      name: input.name,
      kind: input.kind,
      monthly_budget: input.kind === "expense" ? input.monthlyBudget ?? null : null
    })
    .eq("id", id)
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

export async function archiveCategory(id: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("categories").update({ archived: true }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createSubcategory(input: NewSubcategoryInput): Promise<Subcategory> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("subcategories")
    .insert({
      ...(input.id ? { id: input.id } : {}),
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

export async function updateSubcategory(id: string, input: NewSubcategoryInput): Promise<Subcategory> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("subcategories")
    .update({
      category_id: input.categoryId,
      name: input.name
    })
    .eq("id", id)
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

export async function archiveSubcategory(id: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("subcategories").update({ archived: true }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
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

export async function upsertMonthlyBudget(input: MonthlyBudgetInput): Promise<Budget> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: DEMO_USER_ID,
        category_id: input.categoryId,
        month: input.month,
        amount: input.amount
      },
      { onConflict: "user_id,category_id,month" }
    )
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: data.id,
    categoryId: data.category_id,
    month: data.month,
    amount: Number(data.amount)
  };
}

export async function removeMonthlyBudget(id: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("budgets").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createRecurringRule(input: NewRecurringRuleInput): Promise<RecurringRule> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  let { data, error } = await supabase
    .from("recurring_rules")
    .insert(recurringRulePayload(input, { includeUser: true, includeSubcategory: true }))
    .select("*")
    .single();

  if (isMissingRecurringSubcategoryError(error)) {
    ({ data, error } = await supabase
      .from("recurring_rules")
      .insert(recurringRulePayload(input, { includeUser: true }))
      .select("*")
      .single());
  }

  if (error) {
    throw new Error(error.message);
  }

  return mapRecurringRule(data);
}

export async function updateRecurringRule(id: string, input: UpdateRecurringRuleInput): Promise<RecurringRule> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  let { data, error } = await supabase
    .from("recurring_rules")
    .update(recurringRulePayload(input, { includeSubcategory: true }))
    .eq("id", id)
    .select("*")
    .single();

  if (isMissingRecurringSubcategoryError(error)) {
    ({ data, error } = await supabase
      .from("recurring_rules")
      .update(recurringRulePayload(input))
      .eq("id", id)
      .select("*")
      .single());
  }

  if (error) {
    throw new Error(error.message);
  }

  return mapRecurringRule(data);
}

export async function archiveRecurringRule(id: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("recurring_rules").update({ active: false }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createGoal(input: NewGoalInput): Promise<Goal> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("goals")
    .insert({
      ...(input.id ? { id: input.id } : {}),
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

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase
    .from("goals")
    .update({
      name: input.name,
      target_amount: input.targetAmount,
      current_amount: input.currentAmount,
      target_date: input.targetDate || null
    })
    .eq("id", id)
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

export async function archiveGoal(id: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("goals").update({ archived: true }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function savePushSubscription(input: PushSubscriptionRecord) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: DEMO_USER_ID,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth
      },
      { onConflict: "endpoint" }
    );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deletePushSubscription(endpoint: string) {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchPushSubscriptions(): Promise<PushSubscriptionRecord[]> {
  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Missing Supabase environment variables.");
  }

  const { data, error } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({ endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth }));
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
