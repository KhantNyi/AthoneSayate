"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { parseISO } from "date-fns";
import { currency } from "@athonesayate/shared/metrics";
import { isMissing, validateBudget } from "@/lib/validation";
import { useApp } from "../app-context";
import { FormAlert, INVALID_FIELD, Panel } from "../ui";

export default function BudgetsTab() {
  const {
    t,
    categories,
    categoryLabel,
    budgetMonth,
    setBudgetMonth,
    setVisibleMonth,
    budgetCategoryId,
    setBudgetCategoryId,
    budgetAmount,
    setBudgetAmount,
    budgetDrafts,
    setBudgetDrafts,
    budgetTabRows,
    editingBudgetId,
    setEditingBudgetId,
    handleSetBudget,
    handleSaveBudget,
    handleDeleteBudget,
    savingBudgetId,
    formIssues,
    formAttempted,
    chooseTab
  } = useApp();

  const expenseCategories = categories.filter((category) => category.kind === "expense");
  const issues = formIssues.budget;
  const showIssues = formAttempted("budget");

  return (
    <Panel id="budgets" title={t.budgetHealth} action={t.monthlyLimits}>
      <form onSubmit={handleSetBudget} noValidate className="mb-4 max-w-3xl rounded-lg border border-river/15 bg-river/5 p-3">
        <h3 className="mb-3 text-sm font-semibold uppercase text-river">Set new monthly budget</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[150px_minmax(0,1fr)_150px_auto]">
          <input
            type="month"
            value={budgetMonth}
            onChange={(event) => {
              setBudgetMonth(event.target.value);
              setVisibleMonth(parseISO(`${event.target.value}-01`));
            }}
            className="h-11 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
          />
          <select
            value={budgetCategoryId}
            onChange={(event) => setBudgetCategoryId(event.target.value)}
            aria-invalid={isMissing(issues, "categoryId", showIssues) || undefined}
            className={`h-11 min-w-0 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "categoryId", showIssues) ? INVALID_FIELD : "border-ink/10"}`}
          >
            {expenseCategories.length > 0 ? null : <option value="">No expense categories</option>}
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
            ))}
          </select>
          <input
            value={budgetAmount}
            onChange={(event) => setBudgetAmount(event.target.value)}
            aria-invalid={isMissing(issues, "amount", showIssues) || undefined}
            className={`h-11 min-w-0 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "amount", showIssues) ? INVALID_FIELD : "border-ink/10"}`}
            inputMode="decimal"
            placeholder="Amount"
          />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-bright disabled:opacity-50 sm:col-span-2 lg:col-span-1" disabled={savingBudgetId === budgetCategoryId}>
            <Plus size={17} />
            {savingBudgetId === budgetCategoryId ? "Saving budget" : "Save monthly budget"}
          </button>
          <FormAlert result={issues} show={showIssues} onFix={chooseTab} className="sm:col-span-2 lg:col-span-full" />
        </div>
      </form>
      <div className="grid gap-3 xl:grid-cols-2">
        {budgetTabRows.map((row) => {
          const isEditing = editingBudgetId === row.id;
          const rowIssues = validateBudget({
            action: "update this budget",
            categoryId: row.id,
            amount: budgetDrafts[row.id] ?? "",
            expenseCategoryCount: expenseCategories.length
          });

          return (
          <article key={row.id} className={`rounded-lg border p-4 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
            <div className="mb-4 grid gap-3 text-sm md:grid-cols-[1fr_auto] md:items-start">
              <div className="min-w-0">
                <p className="font-medium">{categoryLabel(row.name)}</p>
                <p className={row.spent > (row.monthlyBudget ?? 0) ? "font-semibold text-coral" : "text-ink/60"}>
                  {currency.format(row.spent)} spent / {currency.format(row.monthlyBudget ?? 0)} budget for {budgetMonth}
                </p>
              </div>
              {isEditing ? (
                <form onSubmit={(event) => handleSaveBudget(event, row.id)} noValidate className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 md:w-80">
                  <input
                    value={budgetDrafts[row.id] ?? ""}
                    onChange={(event) => setBudgetDrafts((current) => ({ ...current, [row.id]: event.target.value }))}
                    aria-invalid={isMissing(rowIssues, "amount") || undefined}
                    className={`h-10 min-w-0 rounded-lg border bg-white px-3 text-sm ${isMissing(rowIssues, "amount") ? INVALID_FIELD : "border-ink/10"}`}
                    inputMode="decimal"
                    placeholder="Budget"
                  />
                  <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-bright disabled:opacity-50" disabled={savingBudgetId === row.id}>
                    {savingBudgetId === row.id ? "Saving" : "Update"}
                  </button>
                  <button type="button" aria-label="Cancel budget edit" onClick={() => {
                    setEditingBudgetId("");
                    setBudgetDrafts((current) => ({ ...current, [row.id]: String(row.monthlyBudget ?? "") }));
                  }} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
                    <X size={16} />
                  </button>
                  <FormAlert result={rowIssues} className="col-span-full" />
                </form>
              ) : (
                <div className="inline-flex justify-end gap-1">
                  <button type="button" aria-label="Edit budget" onClick={() => {
                    setEditingBudgetId(row.id);
                    setBudgetDrafts((current) => ({ ...current, [row.id]: String(row.monthlyBudget ?? "") }));
                  }} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                    <Pencil size={16} />
                  </button>
                  <button type="button" aria-label="Delete budget category" onClick={() => handleDeleteBudget(row.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral" disabled={savingBudgetId === row.id}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            <div className="max-w-md">
              <div className="mb-2 flex items-center justify-between text-xs font-medium text-ink/50">
                <span>{Math.min(row.progress, 100).toFixed(0)}% used</span>
                <span>{currency.format(row.remaining)} left</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                <div className="h-full rounded-full" style={{ width: `${Math.min(row.progress, 100)}%`, background: row.spent > (row.monthlyBudget ?? Infinity) ? "rgb(var(--coral))" : "rgb(var(--amber))" }} />
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </Panel>
  );
}
