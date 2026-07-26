import type { Category, TransactionType } from "@athonesayate/shared/types";
import type { TabKey } from "@/components/nav";

/**
 * Requirement checks shared by the submit handlers and the forms themselves, so
 * a blocked action always says exactly what is missing instead of failing
 * silently or leaving a button disabled with no explanation.
 */

/** Where the user has to go to satisfy a prerequisite the form cannot create. */
export type RequirementFix = { label: string; tab: TabKey };

export type Requirement = {
  /** Identifies the control to outline while the requirement is unmet. */
  field: string;
  /** What the user still has to do, phrased as an instruction. */
  need: string;
  /** Set when the requirement is satisfied on another screen. */
  fix?: RequirementFix;
};

export type ValidationResult = {
  ok: boolean;
  /** Fields still missing, so forms can outline the offending controls. */
  fields: string[];
  /** One sentence naming the blocked action and everything it is waiting on. */
  message: string;
  fix?: RequirementFix;
};

const OK: ValidationResult = { ok: true, fields: [], message: "" };

const CATEGORY_SETTINGS: RequirementFix = { label: "Open category settings", tab: "settings" };
const ACCOUNT_SETTINGS: RequirementFix = { label: "Open account settings", tab: "settings" };

function listNeeds(needs: string[]) {
  if (needs.length < 2) {
    return needs.join("");
  }
  return `${needs.slice(0, -1).join(", ")} and ${needs[needs.length - 1]}`;
}

/** Collapses the unmet requirements of one action into a single explicit sentence. */
export function evaluate(action: string, requirements: (Requirement | null | false)[]): ValidationResult {
  const unmet = requirements.filter((requirement): requirement is Requirement => Boolean(requirement));

  if (unmet.length === 0) {
    return OK;
  }

  return {
    ok: false,
    fields: unmet.map((requirement) => requirement.field),
    message: `Can't ${action} yet — ${listNeeds(unmet.map((requirement) => requirement.need))}.`,
    fix: unmet.find((requirement) => requirement.fix)?.fix
  };
}

/** True when this specific control is one of the things still missing. */
export function isMissing(result: ValidationResult, field: string, show = true) {
  return show && !result.ok && result.fields.includes(field);
}

function textRequirement(field: string, value: string, need: string): Requirement | null {
  return value.trim() ? null : { field, need };
}

function amountRequirement(field: string, value: string, label: string): Requirement | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return { field, need: `enter ${label}` };
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return { field, need: `enter ${label} as a number` };
  }

  if (parsed <= 0) {
    return { field, need: `enter ${label} greater than 0` };
  }

  return null;
}

/**
 * A category picker can be empty because nothing is selected, or because no
 * category of that kind exists yet — two very different fixes.
 */
function categoryRequirement(
  field: string,
  categoryId: string,
  kind: TransactionType,
  categories: Category[]
): Requirement | null {
  if (!categories.some((category) => category.kind === kind)) {
    return { field, need: `create ${kind === "income" ? "an income" : "an expense"} category first`, fix: CATEGORY_SETTINGS };
  }

  return categoryId ? null : { field, need: "choose a category" };
}

function accountRequirement(field: string, accountId: string, accountCount: number): Requirement | null {
  if (accountCount === 0) {
    return { field, need: "add a banking account first", fix: ACCOUNT_SETTINGS };
  }

  return accountId ? null : { field, need: "choose an account" };
}

export function validateTransaction(input: {
  action?: string;
  type: TransactionType;
  amount: string;
  categoryId: string;
  accountId: string;
  categories: Category[];
  accountCount: number;
}): ValidationResult {
  return evaluate(input.action ?? "save this transaction", [
    amountRequirement("amount", input.amount, "an amount"),
    categoryRequirement("categoryId", input.categoryId, input.type, input.categories),
    accountRequirement("accountId", input.accountId, input.accountCount)
  ]);
}

export function validateRecurring(input: {
  action?: string;
  type: TransactionType;
  name: string;
  amount: string;
  categoryId: string;
  accountId: string;
  nextDueOn: string;
  categories: Category[];
  accountCount: number;
}): ValidationResult {
  return evaluate(input.action ?? "save this recurring item", [
    textRequirement("name", input.name, "name it"),
    amountRequirement("amount", input.amount, "an amount"),
    categoryRequirement("categoryId", input.categoryId, input.type, input.categories),
    accountRequirement("accountId", input.accountId, input.accountCount),
    textRequirement("nextDueOn", input.nextDueOn, "pick the next due date")
  ]);
}

export function validateGoal(input: { action?: string; name: string; targetAmount: string }): ValidationResult {
  return evaluate(input.action ?? "save this goal", [
    textRequirement("name", input.name, "name the goal"),
    amountRequirement("targetAmount", input.targetAmount, "a target amount")
  ]);
}

export function validateCategory(input: { action?: string; name: string; monthlyBudget: string }): ValidationResult {
  const budget = input.monthlyBudget.trim();
  const parsedBudget = Number(budget);

  return evaluate(input.action ?? "save this category", [
    textRequirement("name", input.name, "name the category"),
    budget && !Number.isFinite(parsedBudget) ? { field: "monthlyBudget", need: "enter the monthly budget as a number" } : null,
    budget && Number.isFinite(parsedBudget) && parsedBudget < 0
      ? { field: "monthlyBudget", need: "use a monthly budget of 0 or more" }
      : null
  ]);
}

export function validateSubcategory(input: {
  action?: string;
  name: string;
  categoryId: string;
  categoryCount: number;
}): ValidationResult {
  return evaluate(input.action ?? "save this subcategory", [
    input.categoryCount === 0
      ? { field: "categoryId", need: "create a category first", fix: CATEGORY_SETTINGS }
      : textRequirement("categoryId", input.categoryId, "choose the parent category"),
    textRequirement("name", input.name, "name the subcategory")
  ]);
}

export function validateBudget(input: {
  action?: string;
  categoryId: string;
  amount: string;
  expenseCategoryCount: number;
}): ValidationResult {
  const amount = input.amount.trim();
  const parsedAmount = Number(amount);

  return evaluate(input.action ?? "save this budget", [
    input.expenseCategoryCount === 0
      ? { field: "categoryId", need: "create an expense category first", fix: CATEGORY_SETTINGS }
      : textRequirement("categoryId", input.categoryId, "choose a category"),
    !amount
      ? { field: "amount", need: "enter a budget amount" }
      : !Number.isFinite(parsedAmount)
        ? { field: "amount", need: "enter the budget as a number" }
        : parsedAmount < 0
          ? { field: "amount", need: "use a budget of 0 or more" }
          : null
  ]);
}

export function validateAccount(input: { action?: string; name: string; openingBalance: string }): ValidationResult {
  const balance = input.openingBalance.trim();

  return evaluate(input.action ?? "save this account", [
    textRequirement("name", input.name, "name the account"),
    !balance
      ? { field: "openingBalance", need: "enter an opening balance" }
      : !Number.isFinite(Number(balance))
        ? { field: "openingBalance", need: "enter the opening balance as a number" }
        : null
  ]);
}
