// Offline-aware wrapper around the shared Supabase data layer.
//
// Reads: network first, falling back to the last good snapshot cached in
// localStorage. Writes: tried against the network; when that fails because the
// device is offline, the mutation is queued (and applied to the cached
// snapshot so reloads reflect it) and replayed in order once connectivity
// returns. Queued creates carry client-generated UUIDs so the optimistic row
// and the eventually-inserted row are the same record.
import * as remote from "@athonesayate/shared/supabase-data";
import type {
  ExpenseData,
  MonthlyBudgetInput,
  NewCategoryInput,
  NewGoalInput,
  NewRecurringRuleInput,
  NewSubcategoryInput,
  NewTransactionInput,
  UpdateAccountInput,
  UpdateCategoryInput,
  UpdateGoalInput,
  UpdateRecurringRuleInput,
  UpdateTransactionInput
} from "@athonesayate/shared/supabase-data";
import type { Account, Budget, Category, Goal, RecurringRule, Subcategory, Transaction, TransactionType } from "@athonesayate/shared/types";

const CACHE_KEY = "athonesayate-data-cache-v1";
const QUEUE_KEY = "athonesayate-mutation-queue-v1";

export type SyncState = {
  online: boolean;
  pending: number;
  syncing: boolean;
};

type QueuedMutation = {
  id: string;
  fn: keyof typeof replayHandlers;
  args: unknown[];
};

const syncListeners = new Set<(state: SyncState) => void>();
let queueDrainedCallback: (() => void) | null = null;
let replaying = false;
let listenersBound = false;

function isBrowser() {
  return typeof window !== "undefined";
}

export function getSyncState(): SyncState {
  return {
    online: isBrowser() ? navigator.onLine : true,
    pending: readQueue().length,
    syncing: replaying
  };
}

export function subscribeSyncState(listener: (state: SyncState) => void) {
  syncListeners.add(listener);
  bindConnectivityListeners();
  listener(getSyncState());
  return () => {
    syncListeners.delete(listener);
  };
}

/** Called once after a queued batch replays successfully, so the app can refetch. */
export function setQueueDrainedCallback(callback: (() => void) | null) {
  queueDrainedCallback = callback;
}

function notifySyncListeners() {
  const state = getSyncState();
  syncListeners.forEach((listener) => listener(state));
}

function bindConnectivityListeners() {
  if (!isBrowser() || listenersBound) {
    return;
  }
  listenersBound = true;
  window.addEventListener("online", () => {
    notifySyncListeners();
    void replayQueue();
  });
  window.addEventListener("offline", notifySyncListeners);
}

function isOfflineError(error: unknown) {
  if (isBrowser() && !navigator.onLine) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /failed to fetch|fetch failed|load failed|networkerror|network request failed/i.test(message);
}

// --- snapshot cache -------------------------------------------------------

export function readCache(): ExpenseData | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as ExpenseData) : null;
  } catch {
    return null;
  }
}

function writeCache(data: ExpenseData) {
  if (!isBrowser()) {
    return;
  }
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage full or unavailable: offline fallback just won't have fresh data
  }
}

function mutateCache(mutator: (data: ExpenseData) => void) {
  const cached = readCache();
  if (!cached) {
    return;
  }
  mutator(cached);
  writeCache(cached);
}

// --- queue ----------------------------------------------------------------

function readQueue(): QueuedMutation[] {
  if (!isBrowser()) {
    return [];
  }
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedMutation[]) {
  if (!isBrowser()) {
    return;
  }
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // if the queue can't be stored the mutation is lost after reload,
    // but the in-memory optimistic state still holds for this session
  }
  notifySyncListeners();
}

function enqueue(fn: QueuedMutation["fn"], args: unknown[]) {
  const queue = readQueue();
  queue.push({ id: newId(), fn, args });
  writeQueue(queue);
}

const replayHandlers = {
  createTransaction: (args: unknown[]) => remote.createTransaction(args[0] as NewTransactionInput),
  updateTransaction: (args: unknown[]) => remote.updateTransaction(args[0] as string, args[1] as UpdateTransactionInput),
  removeTransaction: (args: unknown[]) => remote.removeTransaction(args[0] as string),
  createCategory: (args: unknown[]) => remote.createCategory(args[0] as NewCategoryInput),
  updateCategory: (args: unknown[]) => remote.updateCategory(args[0] as string, args[1] as UpdateCategoryInput),
  archiveCategory: (args: unknown[]) => remote.archiveCategory(args[0] as string),
  createSubcategory: (args: unknown[]) => remote.createSubcategory(args[0] as NewSubcategoryInput),
  updateSubcategory: (args: unknown[]) => remote.updateSubcategory(args[0] as string, args[1] as NewSubcategoryInput),
  archiveSubcategory: (args: unknown[]) => remote.archiveSubcategory(args[0] as string),
  updateCategoryBudget: (args: unknown[]) => remote.updateCategoryBudget(args[0] as string, args[1] as number | null),
  upsertMonthlyBudget: (args: unknown[]) => remote.upsertMonthlyBudget(args[0] as MonthlyBudgetInput),
  removeMonthlyBudget: (args: unknown[]) => remote.removeMonthlyBudget(args[0] as string),
  createRecurringRule: (args: unknown[]) => remote.createRecurringRule(args[0] as NewRecurringRuleInput),
  updateRecurringRule: (args: unknown[]) => remote.updateRecurringRule(args[0] as string, args[1] as UpdateRecurringRuleInput),
  archiveRecurringRule: (args: unknown[]) => remote.archiveRecurringRule(args[0] as string),
  createGoal: (args: unknown[]) => remote.createGoal(args[0] as NewGoalInput),
  updateGoal: (args: unknown[]) => remote.updateGoal(args[0] as string, args[1] as UpdateGoalInput),
  archiveGoal: (args: unknown[]) => remote.archiveGoal(args[0] as string),
  updateAccount: (args: unknown[]) => remote.updateAccount(args[0] as string, args[1] as UpdateAccountInput),
  archiveAccount: (args: unknown[]) => remote.archiveAccount(args[0] as string)
} as const;

export async function replayQueue() {
  if (replaying || !isBrowser() || !navigator.onLine) {
    return;
  }

  let queue = readQueue();
  if (queue.length === 0) {
    return;
  }

  replaying = true;
  notifySyncListeners();

  let drained = false;
  try {
    while (queue.length > 0) {
      const item = queue[0];
      try {
        await replayHandlers[item.fn](item.args);
      } catch (error) {
        if (isOfflineError(error)) {
          // still offline: keep the queue and retry on the next online event
          return;
        }
        // permanent failure (constraint, bad data): drop it so it can't wedge the queue
        console.warn(`Dropping unsyncable offline change ${item.fn}:`, error);
      }
      queue = queue.slice(1);
      writeQueue(queue);
    }
    drained = true;
  } finally {
    replaying = false;
    notifySyncListeners();
    if (drained) {
      queueDrainedCallback?.();
    }
  }
}

function newId() {
  if (isBrowser() && typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// --- reads ----------------------------------------------------------------

export async function loadExpenseData(): Promise<{ data: ExpenseData; fromCache: boolean }> {
  bindConnectivityListeners();
  void replayQueue();

  try {
    const data = await remote.fetchExpenseData();
    // Only trust the network snapshot when nothing is waiting to sync,
    // otherwise it would erase queued offline changes from the cache.
    if (readQueue().length === 0) {
      writeCache(data);
    }
    return { data, fromCache: false };
  } catch (error) {
    const cached = readCache();
    if (cached && isOfflineError(error)) {
      return { data: cached, fromCache: true };
    }
    throw error;
  }
}

// --- writes ---------------------------------------------------------------

async function runMutation<T>(
  fn: QueuedMutation["fn"],
  args: unknown[],
  optimistic: () => T,
  applyToCache: (data: ExpenseData, result: T) => void
): Promise<T> {
  try {
    const result = (await replayHandlers[fn](args)) as T;
    mutateCache((data) => applyToCache(data, result));
    return result;
  } catch (error) {
    if (!isOfflineError(error)) {
      throw error;
    }
    const result = optimistic();
    enqueue(fn, args);
    mutateCache((data) => applyToCache(data, result));
    return result;
  }
}

export async function createTransaction(input: NewTransactionInput): Promise<Transaction> {
  const withId = { ...input, id: input.id ?? newId() };
  return runMutation(
    "createTransaction",
    [withId],
    () => ({
      id: withId.id,
      accountId: withId.accountId,
      categoryId: withId.categoryId,
      subcategoryId: withId.subcategoryId,
      type: withId.type,
      amount: withId.amount,
      occurredOn: withId.occurredOn,
      merchant: withId.merchant ?? "",
      notes: withId.notes ?? "",
      isRecurring: withId.isRecurring ?? false,
      recurringRuleId: withId.recurringRuleId,
      recurringDueOn: withId.recurringDueOn
    }),
    (data, result) => {
      data.transactions = [result, ...data.transactions.filter((tx) => tx.id !== result.id)];
    }
  );
}

export async function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  return runMutation(
    "updateTransaction",
    [id, input],
    () => {
      const existing = readCache()?.transactions.find((tx) => tx.id === id);
      return {
        ...(existing ?? { id, isRecurring: false as boolean | undefined }),
        id,
        accountId: input.accountId,
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        type: input.type,
        amount: input.amount,
        occurredOn: input.occurredOn,
        merchant: input.merchant ?? "",
        notes: input.notes ?? ""
      } as Transaction;
    },
    (data, result) => {
      data.transactions = data.transactions.map((tx) => (tx.id === result.id ? result : tx));
    }
  );
}

export async function removeTransaction(id: string): Promise<void> {
  return runMutation(
    "removeTransaction",
    [id],
    () => undefined,
    (data) => {
      data.transactions = data.transactions.filter((tx) => tx.id !== id);
    }
  );
}

export async function createCategory(input: NewCategoryInput): Promise<Category> {
  const withId = { ...input, id: input.id ?? newId() };
  return runMutation(
    "createCategory",
    [withId],
    () => ({
      id: withId.id,
      name: withId.name,
      kind: withId.kind as TransactionType,
      icon: "tag",
      color: "#2563eb",
      monthlyBudget: withId.kind === "expense" ? withId.monthlyBudget : undefined
    }),
    (data, result) => {
      data.categories = [...data.categories.filter((item) => item.id !== result.id), result].sort((a, b) => a.name.localeCompare(b.name));
    }
  );
}

export async function updateCategory(id: string, input: UpdateCategoryInput): Promise<Category> {
  return runMutation(
    "updateCategory",
    [id, input],
    () => {
      const existing = readCache()?.categories.find((item) => item.id === id);
      return {
        id,
        name: input.name,
        kind: input.kind,
        icon: existing?.icon ?? "tag",
        color: existing?.color ?? "#2563eb",
        monthlyBudget: input.kind === "expense" ? input.monthlyBudget : undefined
      };
    },
    (data, result) => {
      data.categories = data.categories.map((item) => (item.id === result.id ? result : item)).sort((a, b) => a.name.localeCompare(b.name));
    }
  );
}

export async function archiveCategory(id: string): Promise<void> {
  return runMutation(
    "archiveCategory",
    [id],
    () => undefined,
    (data) => {
      data.categories = data.categories.filter((item) => item.id !== id);
      data.subcategories = data.subcategories.filter((item) => item.categoryId !== id);
    }
  );
}

export async function createSubcategory(input: NewSubcategoryInput): Promise<Subcategory> {
  const withId = { ...input, id: input.id ?? newId() };
  return runMutation(
    "createSubcategory",
    [withId],
    () => ({ id: withId.id, categoryId: withId.categoryId, name: withId.name }),
    (data, result) => {
      data.subcategories = [...data.subcategories.filter((item) => item.id !== result.id), result].sort((a, b) => a.name.localeCompare(b.name));
    }
  );
}

export async function updateSubcategory(id: string, input: NewSubcategoryInput): Promise<Subcategory> {
  return runMutation(
    "updateSubcategory",
    [id, input],
    () => ({ id, categoryId: input.categoryId, name: input.name }),
    (data, result) => {
      data.subcategories = data.subcategories.map((item) => (item.id === result.id ? result : item)).sort((a, b) => a.name.localeCompare(b.name));
    }
  );
}

export async function archiveSubcategory(id: string): Promise<void> {
  return runMutation(
    "archiveSubcategory",
    [id],
    () => undefined,
    (data) => {
      data.subcategories = data.subcategories.filter((item) => item.id !== id);
    }
  );
}

export async function updateCategoryBudget(categoryId: string, monthlyBudget: number | null): Promise<Category> {
  return runMutation(
    "updateCategoryBudget",
    [categoryId, monthlyBudget],
    () => {
      const existing = readCache()?.categories.find((item) => item.id === categoryId);
      return {
        id: categoryId,
        name: existing?.name ?? "",
        kind: existing?.kind ?? "expense",
        icon: existing?.icon ?? "tag",
        color: existing?.color ?? "#2563eb",
        monthlyBudget: monthlyBudget ?? undefined
      };
    },
    (data, result) => {
      data.categories = data.categories.map((item) => (item.id === result.id ? { ...item, monthlyBudget: result.monthlyBudget } : item));
    }
  );
}

export async function upsertMonthlyBudget(input: MonthlyBudgetInput): Promise<Budget> {
  return runMutation(
    "upsertMonthlyBudget",
    [input],
    () => {
      const existing = readCache()?.budgets.find((item) => item.categoryId === input.categoryId && item.month === input.month);
      return {
        id: existing?.id ?? `offline-budget-${input.categoryId}-${input.month}`,
        categoryId: input.categoryId,
        month: input.month,
        amount: input.amount
      };
    },
    (data, result) => {
      const exists = data.budgets.some((item) => item.categoryId === result.categoryId && item.month === result.month);
      data.budgets = exists
        ? data.budgets.map((item) => (item.categoryId === result.categoryId && item.month === result.month ? result : item))
        : [result, ...data.budgets];
    }
  );
}

export async function removeMonthlyBudget(id: string): Promise<void> {
  return runMutation(
    "removeMonthlyBudget",
    [id],
    () => undefined,
    (data) => {
      data.budgets = data.budgets.filter((item) => item.id !== id);
    }
  );
}

export async function createRecurringRule(input: NewRecurringRuleInput): Promise<RecurringRule> {
  const withId = { ...input, id: input.id ?? newId() };
  return runMutation(
    "createRecurringRule",
    [withId],
    () => ({
      id: withId.id,
      accountId: withId.accountId,
      categoryId: withId.categoryId,
      subcategoryId: withId.subcategoryId,
      type: withId.type,
      amount: withId.amount,
      merchant: withId.merchant,
      frequency: withId.frequency,
      nextDueOn: withId.nextDueOn,
      autoCreate: withId.autoCreate
    }),
    (data, result) => {
      data.recurringRules = [...data.recurringRules.filter((rule) => rule.id !== result.id), result];
    }
  );
}

export async function updateRecurringRule(id: string, input: UpdateRecurringRuleInput): Promise<RecurringRule> {
  return runMutation(
    "updateRecurringRule",
    [id, input],
    () => ({
      id,
      accountId: input.accountId,
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      type: input.type,
      amount: input.amount,
      merchant: input.merchant,
      frequency: input.frequency,
      nextDueOn: input.nextDueOn,
      autoCreate: input.autoCreate
    }),
    (data, result) => {
      data.recurringRules = data.recurringRules.map((rule) => (rule.id === result.id ? result : rule));
    }
  );
}

export async function archiveRecurringRule(id: string): Promise<void> {
  return runMutation(
    "archiveRecurringRule",
    [id],
    () => undefined,
    (data) => {
      data.recurringRules = data.recurringRules.filter((rule) => rule.id !== id);
    }
  );
}

export async function createGoal(input: NewGoalInput): Promise<Goal> {
  const withId = { ...input, id: input.id ?? newId() };
  return runMutation(
    "createGoal",
    [withId],
    () => ({
      id: withId.id,
      name: withId.name,
      targetAmount: withId.targetAmount,
      currentAmount: withId.currentAmount,
      targetDate: withId.targetDate ?? "",
      color: "#2563eb"
    }),
    (data, result) => {
      data.goals = [...data.goals.filter((goal) => goal.id !== result.id), result];
    }
  );
}

export async function updateGoal(id: string, input: UpdateGoalInput): Promise<Goal> {
  return runMutation(
    "updateGoal",
    [id, input],
    () => {
      const existing = readCache()?.goals.find((goal) => goal.id === id);
      return {
        id,
        name: input.name,
        targetAmount: input.targetAmount,
        currentAmount: input.currentAmount,
        targetDate: input.targetDate ?? "",
        color: existing?.color ?? "#2563eb"
      };
    },
    (data, result) => {
      data.goals = data.goals.map((goal) => (goal.id === result.id ? result : goal));
    }
  );
}

export async function archiveGoal(id: string): Promise<void> {
  return runMutation(
    "archiveGoal",
    [id],
    () => undefined,
    (data) => {
      data.goals = data.goals.filter((goal) => goal.id !== id);
    }
  );
}

export async function updateAccount(id: string, input: UpdateAccountInput): Promise<Account> {
  return runMutation(
    "updateAccount",
    [id, input],
    () => ({
      id,
      name: input.name,
      type: input.type,
      openingBalance: input.openingBalance,
      color: input.color
    }),
    (data, result) => {
      data.accounts = data.accounts.map((account) => (account.id === result.id ? result : account));
    }
  );
}

export async function archiveAccount(id: string): Promise<void> {
  return runMutation(
    "archiveAccount",
    [id],
    () => undefined,
    (data) => {
      data.accounts = data.accounts.filter((account) => account.id !== id);
    }
  );
}
