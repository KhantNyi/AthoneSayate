"use client";

import { Fragment } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { preciseCurrency } from "@athonesayate/shared/metrics";
import type { Transaction, TransactionType } from "@athonesayate/shared/types";
import { transactionToDraft } from "@/lib/drafts";
import { isMissing, validateTransaction } from "@/lib/validation";
import { useApp } from "../app-context";
import { MonthCalendar } from "../month-calendar";
import { FormAlert, INVALID_FIELD, Panel } from "../ui";

function TransactionEditor({ transaction }: { transaction: Transaction }) {
  const {
    t,
    accounts,
    categories,
    subcategories,
    categoryLabel,
    transactionDrafts,
    updateTransactionDraft,
    handleUpdateTransaction,
    cancelEditingTransaction,
    savingTransactionId,
    chooseTab
  } = useApp();

  const draft = transactionDrafts[transaction.id] ?? transactionToDraft(transaction);
  const issues = validateTransaction({
    action: "update this transaction",
    type: draft.type,
    amount: draft.amount,
    categoryId: draft.categoryId,
    accountId: draft.accountId,
    categories,
    accountCount: accounts.length
  });

  return (
    <form onSubmit={(event) => handleUpdateTransaction(transaction, event)} noValidate className="grid gap-2 rounded-lg border border-river/15 bg-river/5 p-3 lg:grid-cols-[110px_110px_140px_140px_minmax(170px,1fr)_145px_auto_auto]">
      <select value={draft.type} onChange={(event) => updateTransactionDraft(transaction.id, { type: event.target.value as TransactionType })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
        <option value="expense">{t.expense}</option>
        <option value="income">{t.income}</option>
      </select>
      <input value={draft.amount} onChange={(event) => updateTransactionDraft(transaction.id, { amount: event.target.value })} aria-invalid={isMissing(issues, "amount") || undefined} className={`h-10 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "amount") ? INVALID_FIELD : "border-ink/10"}`} inputMode="decimal" placeholder={t.amount} />
      <select value={draft.categoryId} onChange={(event) => updateTransactionDraft(transaction.id, { categoryId: event.target.value })} aria-invalid={isMissing(issues, "categoryId") || undefined} className={`h-10 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "categoryId") ? INVALID_FIELD : "border-ink/10"}`}>
        {categories.some((category) => category.kind === draft.type) ? null : <option value="">No {draft.type} categories</option>}
        {categories.filter((category) => category.kind === draft.type).map((category) => (
          <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
        ))}
      </select>
      <select value={draft.subcategoryId} onChange={(event) => updateTransactionDraft(transaction.id, { subcategoryId: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
        <option value="">Subcategory</option>
        {subcategories.filter((subcategory) => subcategory.categoryId === draft.categoryId).map((subcategory) => (
          <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
        ))}
      </select>
      <select value={draft.accountId} onChange={(event) => updateTransactionDraft(transaction.id, { accountId: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>{account.name}</option>
        ))}
      </select>
      <input type="date" value={draft.occurredOn} onChange={(event) => updateTransactionDraft(transaction.id, { occurredOn: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
      <button disabled={savingTransactionId === transaction.id} className="inline-flex h-10 items-center justify-center rounded-lg bg-river px-4 text-sm font-semibold text-bright transition hover:bg-river/85 disabled:cursor-not-allowed disabled:opacity-45">
        {savingTransactionId === transaction.id ? "Saving" : "Update"}
      </button>
      <button type="button" aria-label="Cancel edit" onClick={() => cancelEditingTransaction(transaction)} className="inline-grid h-10 place-items-center rounded-lg border border-ink/10 bg-white px-3 text-ink/55 transition hover:bg-ink/5 hover:text-ink">
        <X size={16} />
      </button>
      <input value={draft.notes} onChange={(event) => updateTransactionDraft(transaction.id, { notes: event.target.value })} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm lg:col-span-full" placeholder={t.optionalNote} />
      <FormAlert result={issues} onFix={chooseTab} className="lg:col-span-full" />
    </form>
  );
}

export default function TransactionsTab() {
  const {
    t,
    ui,
    query,
    setQuery,
    txFilterType,
    setTxFilterType,
    txFilterCategoryId,
    setTxFilterCategoryId,
    txFilterAccountId,
    setTxFilterAccountId,
    txFilterCount,
    clearTransactionFilters,
    filteredTransactions,
    type,
    setType,
    amount,
    setAmount,
    categoryId,
    setCategoryId,
    subcategoryId,
    setSubcategoryId,
    accountId,
    setAccountId,
    occurredOn,
    setOccurredOn,
    notes,
    setNotes,
    isSaving,
    handleSubmit,
    formIssues,
    formAttempted,
    chooseTab,
    accounts,
    categories,
    subcategories,
    displayCategories,
    categoryLabel,
    editingTransactionId,
    startEditingTransaction,
    deleteTransaction,
    visibleMonth,
    setVisibleMonth,
    selectedTransactionDate,
    setSelectedTransactionDate,
    transactionCalendarDays
  } = useApp();

  const issues = formIssues.transaction;
  const showIssues = formAttempted("transaction");

  // Show a longer list while the user is actively narrowing things down.
  const filtersActive = Boolean(query || txFilterCount > 0 || selectedTransactionDate);
  const visibleTransactions = filteredTransactions.slice(0, filtersActive ? 50 : 14);

  return (
    <Panel id="transactions" title={t.transactions} action={`${filteredTransactions.length} ${t.entries}`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
      <div className="mb-4 grid gap-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-lg border border-ink/10 bg-white pl-10 pr-3 text-sm"
            placeholder={t.searchPlaceholder}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <select
            value={txFilterType}
            onChange={(event) => setTxFilterType(event.target.value as "all" | TransactionType)}
            className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            aria-label="Filter by type"
          >
            <option value="all">All types</option>
            <option value="expense">{t.expense}</option>
            <option value="income">{t.income}</option>
          </select>
          <select
            value={txFilterCategoryId}
            onChange={(event) => setTxFilterCategoryId(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {displayCategories.map((category) => (
              <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
            ))}
          </select>
          <select
            value={txFilterAccountId}
            onChange={(event) => setTxFilterAccountId(event.target.value)}
            className="h-10 min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            aria-label="Filter by account"
          >
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={clearTransactionFilters}
            disabled={!query && txFilterCount === 0}
            className="h-10 rounded-lg border border-ink/10 bg-white px-4 text-sm font-semibold text-ink/60 transition hover:bg-ink/[0.04] hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            {ui.clear}
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate className="rounded-lg border border-river/15 bg-river/5 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase text-river">Record new transaction</h3>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${type === "income" ? "bg-moss/12 text-moss" : "bg-coral/12 text-coral"}`}>
              {type === "income" ? t.income : t.expense}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[110px_110px_140px_140px_minmax(170px,1fr)_145px_auto]">
            <select value={type} onChange={(event) => setType(event.target.value as TransactionType)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
              <option value="expense">{t.expense}</option>
              <option value="income">{t.income}</option>
            </select>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} aria-invalid={isMissing(issues, "amount", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "amount", showIssues) ? INVALID_FIELD : "border-ink/10"}`} inputMode="decimal" placeholder={t.amount} />
            <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} aria-invalid={isMissing(issues, "categoryId", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "categoryId", showIssues) ? INVALID_FIELD : "border-ink/10"}`}>
              {categories.some((category) => category.kind === type) ? null : <option value="">No {type} categories</option>}
              {categories.filter((category) => category.kind === type).map((category) => (
                <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
              ))}
            </select>
            <select value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
              <option value="">Subcategory</option>
              {subcategories.filter((subcategory) => subcategory.categoryId === categoryId).map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
              ))}
            </select>
            <select value={accountId} onChange={(event) => setAccountId(event.target.value)} aria-invalid={isMissing(issues, "accountId", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "accountId", showIssues) ? INVALID_FIELD : "border-ink/10"}`}>
              {accounts.length > 0 ? null : <option value="">No accounts yet</option>}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
            <input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
            <button disabled={isSaving} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-bright transition hover:bg-river/85 disabled:cursor-not-allowed disabled:opacity-45">
              <Plus size={17} />
              {isSaving ? "Saving" : t.add}
            </button>
            <input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2 lg:col-span-full" placeholder={t.optionalNote} />
            <FormAlert result={issues} show={showIssues} onFix={chooseTab} className="sm:col-span-2 lg:col-span-full" />
          </div>
        </form>
      </div>

      <div className="grid gap-3 lg:hidden">
        {visibleTransactions.map((tx) => {
          const category = displayCategories.find((item) => item.id === tx.categoryId);
          const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
          const account = accounts.find((item) => item.id === tx.accountId);
          const isEditing = editingTransactionId === tx.id;
          return (
            <article key={tx.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{categoryLabel(category?.name)}{subcategory ? ` / ${subcategory.name}` : ""}</p>
                  <p className="mt-1 text-sm text-ink/55">{format(parseISO(tx.occurredOn), "MMM d")} - {account?.name}{tx.notes ? ` - ${tx.notes}` : ""}</p>
                </div>
                <strong className={`shrink-0 text-right ${tx.type === "income" ? "text-moss" : "text-coral"}`}>
                  {tx.type === "income" ? "+" : "-"}{preciseCurrency.format(tx.amount)}
                </strong>
              </div>
              {isEditing ? (
                <div className="mt-3">
                  <TransactionEditor transaction={tx} />
                </div>
              ) : (
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: category?.color }} />
                  <span className="truncate">{subcategory?.name ?? categoryLabel(category?.name)}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <button aria-label="Edit transaction" onClick={() => startEditingTransaction(tx)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                    <Pencil size={16} />
                  </button>
                  <button aria-label="Delete transaction" onClick={() => deleteTransaction(tx.id)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
              )}
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-ink/50">
              <th className="border-b border-ink/10 py-3 font-semibold">{t.date}</th>
              <th className="border-b border-ink/10 py-3 font-semibold">{t.category}</th>
              <th className="border-b border-ink/10 py-3 font-semibold">Subcategory</th>
              <th className="border-b border-ink/10 py-3 font-semibold">{t.account}</th>
              <th className="border-b border-ink/10 py-3 text-right font-semibold">{t.amount}</th>
              <th className="border-b border-ink/10 py-3 text-right font-semibold">{t.action}</th>
            </tr>
          </thead>
          <tbody>
            {visibleTransactions.map((tx) => {
              const category = displayCategories.find((item) => item.id === tx.categoryId);
              const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
              const account = accounts.find((item) => item.id === tx.accountId);
              const isEditing = editingTransactionId === tx.id;
              return (
                <Fragment key={tx.id}>
                  <tr className={`group ${isEditing ? "bg-river/5" : ""}`}>
                    <td className="border-b border-ink/5 py-3 text-ink/65">{format(parseISO(tx.occurredOn), "MMM d")}</td>
                    <td className="border-b border-ink/5 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: category?.color }} />
                        {categoryLabel(category?.name)}
                      </span>
                      {tx.notes ? <p className="mt-1 max-w-[240px] truncate text-xs text-ink/45">{tx.notes}</p> : null}
                    </td>
                    <td className="border-b border-ink/5 py-3 font-medium">{subcategory?.name ?? "-"}</td>
                    <td className="border-b border-ink/5 py-3 text-ink/65">{account?.name}</td>
                    <td className={`border-b border-ink/5 py-3 text-right font-semibold ${tx.type === "income" ? "text-moss" : "text-coral"}`}>
                      {tx.type === "income" ? "+" : "-"}{preciseCurrency.format(tx.amount)}
                    </td>
                    <td className="border-b border-ink/5 py-3 text-right">
                      <span className="inline-flex items-center justify-end gap-1">
                        <button aria-label="Edit transaction" onClick={() => startEditingTransaction(tx)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                          <Pencil size={16} />
                        </button>
                        <button aria-label="Delete transaction" onClick={() => deleteTransaction(tx.id)} className="inline-grid size-9 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                          <Trash2 size={16} />
                        </button>
                      </span>
                    </td>
                  </tr>
                  {isEditing ? (
                    <tr>
                      <td colSpan={6} className="border-b border-river/15 py-3">
                        <TransactionEditor transaction={tx} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
        </div>
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <MonthCalendar
            month={visibleMonth}
            selectedDate={selectedTransactionDate}
            summaries={transactionCalendarDays}
            variant="transactions"
            labels={ui}
            onMonthChange={(month) => {
              setVisibleMonth(month);
              setSelectedTransactionDate("");
            }}
            onDateSelect={setSelectedTransactionDate}
            onClearDate={() => setSelectedTransactionDate("")}
          />
        </aside>
      </div>
    </Panel>
  );
}
