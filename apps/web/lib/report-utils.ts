import type { Account, Category, Subcategory, Transaction } from "@athonesayate/shared/types";

export const NO_SUBCATEGORY = "none";

export type ReportFilters = {
  categoryId: string;
  subcategoryId: string;
  accountId: string;
  recurring: "all" | "recurring" | "manual";
  query: string;
};

export type ReportFilterKey = keyof ReportFilters | "date";

export type ReportDrilldownTarget = {
  month?: Date;
  date?: string;
  categoryId?: string;
  subcategoryId?: string;
  accountId?: string;
};

/** The same predicate feeds the overview, comparison, and six-month trend. */
export function createReportExpenseMatcher(
  filters: ReportFilters,
  context: { accounts: Account[]; categories: Category[]; subcategories: Subcategory[] }
) {
  const accounts = new Map(context.accounts.map((item) => [item.id, item.name]));
  const categories = new Map(context.categories.map((item) => [item.id, item.name]));
  const subcategories = new Map(context.subcategories.map((item) => [item.id, item.name]));
  const query = filters.query.trim().toLowerCase();

  return (tx: Transaction) => {
    if (tx.type !== "expense") return false;
    if (filters.categoryId !== "all" && tx.categoryId !== filters.categoryId) return false;
    if (filters.subcategoryId === NO_SUBCATEGORY ? Boolean(tx.subcategoryId) : (
      filters.subcategoryId !== "all" && tx.subcategoryId !== filters.subcategoryId
    )) return false;
    if (filters.accountId !== "all" && tx.accountId !== filters.accountId) return false;
    if (filters.recurring !== "all" && Boolean(tx.isRecurring) !== (filters.recurring === "recurring")) return false;

    const haystack = `${tx.merchant ?? ""} ${tx.notes ?? ""} ${categories.get(tx.categoryId ?? "") ?? ""} ${subcategories.get(tx.subcategoryId ?? "") ?? ""} ${accounts.get(tx.accountId) ?? ""}`;
    return haystack.toLowerCase().includes(query);
  };
}

/** Replace only the clicked dimension, preserving compatible active filters. */
export function applyReportDrilldown(
  filters: ReportFilters,
  target: ReportDrilldownTarget,
  subcategories: Subcategory[]
): ReportFilters {
  const next = { ...filters };
  if (target.categoryId !== undefined) {
    next.categoryId = target.categoryId;
    if (next.subcategoryId !== "all" && next.subcategoryId !== NO_SUBCATEGORY && !subcategories.some((item) => (
      item.id === next.subcategoryId && item.categoryId === next.categoryId
    ))) next.subcategoryId = "all";
  }
  if (target.subcategoryId !== undefined) {
    next.subcategoryId = target.subcategoryId;
    const parent = subcategories.find((item) => item.id === target.subcategoryId);
    if (parent) next.categoryId = parent.categoryId;
  }
  if (target.accountId !== undefined) next.accountId = target.accountId;
  return next;
}
