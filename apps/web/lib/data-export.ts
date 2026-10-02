import type { ExpenseData } from "@athonesayate/shared/supabase-data";
import type { Transaction } from "@athonesayate/shared/types";

export type ExportPeriod =
  | { mode: "all" }
  | { mode: "months" | "dates"; from: string; to: string };

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000")) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function resolveExportPeriod(period: ExportPeriod) {
  if (period.mode === "all") return { startDate: null, endDate: null, label: "All data" };
  let startDate = period.from;
  let endDate = period.to;
  if (period.mode === "months") {
    if (!/^\d{4}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}$/.test(endDate)) {
      throw new Error("Choose a start and end month.");
    }
    startDate += "-01";
    endDate += "-01";
  }
  if (!validDate(startDate) || !validDate(endDate)) throw new Error("Choose a valid start and end date.");
  if (startDate > endDate) throw new Error("The start must be on or before the end.");
  if (period.mode === "months") {
    const monthEnd = new Date(`${endDate}T00:00:00Z`);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1, 0);
    endDate = monthEnd.toISOString().slice(0, 10);
  }
  return { startDate, endDate, label: `${startDate} to ${endDate}` };
}

export function transactionsForExport(transactions: Transaction[], period: ExportPeriod) {
  const { startDate, endDate } = resolveExportPeriod(period);
  return transactions.filter(tx => {
    const date = tx.occurredOn.slice(0, 10);
    return (!startDate || date >= startDate) && (!endDate || date <= endDate);
  }).sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id.localeCompare(b.id));
}

function summarize(transactions: Transaction[]) {
  let income = 0;
  let expenses = 0;
  for (const tx of transactions) {
    const minorUnits = Math.round(tx.amount * 100);
    if (tx.type === "income") income += minorUnits;
    else expenses += minorUnits;
  }
  return { transactionCount: transactions.length, income: income / 100, expenses: expenses / 100, net: (income - expenses) / 100 };
}

function groupTotals(transactions: Transaction[], key: (tx: Transaction) => string) {
  const groups = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const groupKey = key(tx);
    const group = groups.get(groupKey);
    if (group) group.push(tx);
    else groups.set(groupKey, [tx]);
  }
  return Array.from(groups, ([groupKey, rows]) => ({ groupKey, ...summarize(rows) }))
    .sort((a, b) => a.groupKey.localeCompare(b.groupKey));
}

export function buildDataExport(data: ExpenseData, period: ExportPeriod, options: {
  source: "personal" | "demo";
  usingCachedData: boolean;
  pendingChanges: number;
  exportedAt?: string;
}) {
  const range = resolveExportPeriod(period);
  const transactions = transactionsForExport(data.transactions, period);
  const accounts = new Map(data.accounts.map(item => [item.id, item]));
  const categories = new Map(data.categories.map(item => [item.id, item]));
  const subcategories = new Map(data.subcategories.map(item => [item.id, item]));
  const categoryName = (id?: string) => id ? categories.get(id)?.name ?? "Unknown or archived category" : "Uncategorized";
  const subcategoryName = (id?: string) => id ? subcategories.get(id)?.name ?? "Unknown or archived subcategory" : "No subcategory";
  const accountName = (id: string) => accounts.get(id)?.name ?? "Unknown or archived account";
  const labels = (item: { accountId: string; categoryId?: string; subcategoryId?: string }) => ({
    accountName: accountName(item.accountId),
    categoryName: categoryName(item.categoryId),
    subcategoryName: subcategoryName(item.subcategoryId)
  });

  return {
    metadata: {
      schemaVersion: 1,
      application: "Athonesayate",
      exportedAt: options.exportedAt ?? new Date().toISOString(),
      currency: "THB",
      source: options.source,
      usingCachedData: options.usingCachedData,
      pendingChanges: options.pendingChanges,
      period: { mode: period.mode, ...range, inclusive: true },
      descriptions: {
        transactions: "Income and expenses recorded in the selected period. Amounts are positive THB; type determines income or expense. Dates use the recorded calendar day without timezone conversion.",
        summary: "Totals for exported transactions only. Net equals income minus expenses; recurring rules are not added to totals.",
        budgets: "Saved monthly budgets overlapping the selected period; amounts are whole-month targets, not prorated.",
        context: "Accounts, categories, subcategories, active recurring rules and goals are current saved settings, not historical snapshots or filtered by date. Category monthlyBudget is a default; saved monthly budgets override it. Archived settings may be unavailable; their transaction IDs are retained."
      }
    },
    summary: {
      totals: summarize(transactions),
      byMonth: groupTotals(transactions, tx => tx.occurredOn.slice(0, 7)).map(({ groupKey, ...totals }) => ({ month: groupKey, ...totals })),
      byCategory: groupTotals(transactions, tx => tx.categoryId ?? "").map(({ groupKey, ...totals }) => ({ categoryId: groupKey || null, categoryName: categoryName(groupKey), ...totals })),
      bySubcategory: groupTotals(transactions, tx => JSON.stringify([tx.categoryId ?? "", tx.subcategoryId ?? ""])).map(({ groupKey, ...totals }) => {
        const [categoryId, subcategoryId] = JSON.parse(groupKey) as [string, string];
        return { categoryId: categoryId || null, categoryName: categoryName(categoryId), subcategoryId: subcategoryId || null, subcategoryName: subcategoryName(subcategoryId), ...totals };
      }),
      byAccount: groupTotals(transactions, tx => tx.accountId).map(({ groupKey, ...totals }) => ({ accountId: groupKey, accountName: accountName(groupKey), ...totals }))
    },
    transactions: transactions.map(tx => ({ ...tx, ...labels(tx) })),
    budgets: data.budgets.filter(budget => (
      (!range.startDate || budget.month.slice(0, 7) >= range.startDate.slice(0, 7)) &&
      (!range.endDate || budget.month.slice(0, 7) <= range.endDate.slice(0, 7))
    )).map(budget => ({ ...budget, categoryName: categoryName(budget.categoryId) })),
    accounts: data.accounts,
    categories: data.categories,
    subcategories: data.subcategories.map(item => ({ ...item, categoryName: categoryName(item.categoryId) })),
    recurringRules: data.recurringRules.map(rule => ({ ...rule, ...labels(rule) })),
    goals: data.goals
  };
}

export type DataExport = ReturnType<typeof buildDataExport>;

function csvCell(value: string | number | boolean | undefined) {
  let text = value === undefined ? "" : String(value);
  // Quoting alone does not prevent spreadsheet formulas in user-entered text.
  if (typeof value === "string" && (/^\s*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportTransactionsCsv(data: DataExport) {
  const headers = ["id", "date", "type", "amount", "currency", "account_id", "account", "category_id", "category", "subcategory_id", "subcategory", "merchant", "notes", "is_recurring", "recurring_rule_id", "recurring_due_on", "source"];
  const rows = data.transactions.map(tx => [tx.id, tx.occurredOn, tx.type, tx.amount, data.metadata.currency, tx.accountId, tx.accountName, tx.categoryId, tx.categoryName, tx.subcategoryId, tx.subcategoryName, tx.merchant, tx.notes, Boolean(tx.isRecurring), tx.recurringRuleId, tx.recurringDueOn, data.metadata.source].map(csvCell).join(","));
  return "\uFEFF" + [headers.join(","), ...rows].join("\r\n") + "\r\n";
}

export function exportFilename(data: DataExport, format: "json" | "csv") {
  const { startDate, endDate } = data.metadata.period;
  const range = startDate ? `${startDate}_to_${endDate}` : "all-data";
  return `athonesayate-${data.metadata.source === "demo" ? "sample-" : ""}${range}.${format}`;
}
