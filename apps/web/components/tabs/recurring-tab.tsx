"use client";

import { CheckCircle2, CircleAlert, Pencil, Plus, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { currency } from "@athonesayate/shared/metrics";
import type { RecurringRule, TransactionType } from "@athonesayate/shared/types";
import { recurringRuleToDraft } from "@/lib/drafts";
import { isMissing, validateRecurring } from "@/lib/validation";
import { useApp } from "../app-context";
import { MonthCalendar } from "../month-calendar";
import { FormAlert, INVALID_FIELD, Panel } from "../ui";

function RecurringEditor({ rule }: { rule: RecurringRule }) {
  const {
    t,
    accounts,
    categories,
    subcategories,
    categoryLabel,
    recurringDrafts,
    setRecurringDrafts,
    handleUpdateRecurring,
    cancelEditingRecurring,
    savingRecurringId,
    chooseTab
  } = useApp();

  const draft = recurringDrafts[rule.id] ?? recurringRuleToDraft(rule);
  const issues = validateRecurring({
    action: "update this recurring item",
    type: draft.type,
    name: draft.merchant,
    amount: draft.amount,
    categoryId: draft.categoryId,
    accountId: draft.accountId,
    nextDueOn: draft.nextDueOn,
    categories,
    accountCount: accounts.length
  });

  return (
    <form onSubmit={(event) => handleUpdateRecurring(event, rule.id)} noValidate className="grid gap-2 rounded-lg border border-river/15 bg-river/5 p-3 sm:grid-cols-2 lg:grid-cols-[110px_110px_minmax(160px,1fr)_140px_140px_130px_130px_auto_auto]">
      <select
        value={draft.type}
        onChange={(event) => {
          const nextType = event.target.value as TransactionType;
          const nextCategoryId = categories.find((category) => category.kind === nextType)?.id ?? "";
          const nextSubcategoryId = subcategories.find((subcategory) => subcategory.categoryId === nextCategoryId)?.id ?? "";
          setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, type: nextType, categoryId: nextCategoryId, subcategoryId: nextSubcategoryId } }));
        }}
        className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm"
      >
        <option value="expense">{t.expense}</option>
        <option value="income">{t.income}</option>
      </select>
      <input value={draft.amount} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, amount: event.target.value } }))} aria-invalid={isMissing(issues, "amount") || undefined} className={`h-10 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "amount") ? INVALID_FIELD : "border-ink/10"}`} inputMode="decimal" placeholder={t.amount} />
      <input value={draft.merchant} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, merchant: event.target.value } }))} aria-invalid={isMissing(issues, "name") || undefined} className={`h-10 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "name") ? INVALID_FIELD : "border-ink/10"}`} placeholder="Name" />
      <select
        value={draft.categoryId}
        onChange={(event) => {
          const nextCategoryId = event.target.value;
          const nextSubcategoryId = subcategories.find((subcategory) => subcategory.categoryId === nextCategoryId)?.id ?? "";
          setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, categoryId: nextCategoryId, subcategoryId: nextSubcategoryId } }));
        }}
        aria-invalid={isMissing(issues, "categoryId") || undefined}
        className={`h-10 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "categoryId") ? INVALID_FIELD : "border-ink/10"}`}
      >
        {categories.some((category) => category.kind === draft.type) ? null : <option value="">No {draft.type} categories</option>}
        {categories.filter((category) => category.kind === draft.type).map((category) => (
          <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
        ))}
      </select>
      <select value={draft.subcategoryId} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, subcategoryId: event.target.value } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
        <option value="">No subcategory</option>
        {subcategories.filter((subcategory) => subcategory.categoryId === draft.categoryId).map((subcategory) => (
          <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
        ))}
      </select>
      <select value={draft.frequency} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, frequency: event.target.value as RecurringRule["frequency"] } }))} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm">
        <option value="weekly">Weekly</option>
        <option value="biweekly">Biweekly</option>
        <option value="monthly">Monthly</option>
        <option value="quarterly">Quarterly</option>
        <option value="yearly">Yearly</option>
      </select>
      <label className="flex flex-col gap-1 text-xs font-semibold uppercase text-ink/45">
        Due date
        <input
          type="date"
          value={draft.nextDueOn}
          onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...(current[rule.id] ?? draft), nextDueOn: event.target.value } }))}
          aria-invalid={isMissing(issues, "nextDueOn") || undefined}
          className={`h-10 rounded-lg border bg-white px-3 text-sm font-normal normal-case text-ink ${isMissing(issues, "nextDueOn") ? INVALID_FIELD : "border-ink/10"}`}
        />
      </label>
      <button className="h-10 rounded-lg bg-river px-3 text-sm font-semibold text-bright disabled:opacity-50" disabled={savingRecurringId === rule.id}>
        {savingRecurringId === rule.id ? "Saving" : "Update"}
      </button>
      <button type="button" aria-label="Cancel recurring edit" onClick={() => cancelEditingRecurring(rule)} className="grid size-10 place-items-center rounded-lg border border-ink/10 bg-white text-ink/55 transition hover:bg-ink/5 hover:text-ink">
        <X size={16} />
      </button>
      <div className="flex flex-wrap items-center gap-3 text-sm text-ink/55 lg:col-span-full">
        <select value={draft.accountId} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, accountId: event.target.value } }))} aria-invalid={isMissing(issues, "accountId") || undefined} className={`h-9 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "accountId") ? INVALID_FIELD : "border-ink/10"}`}>
          {accounts.length > 0 ? null : <option value="">No accounts yet</option>}
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </select>
        <label className="flex h-9 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3">
          <input type="checkbox" checked={draft.autoCreate} onChange={(event) => setRecurringDrafts((current) => ({ ...current, [rule.id]: { ...draft, autoCreate: event.target.checked } }))} />
          Auto-create
        </label>
      </div>
      <FormAlert result={issues} onFix={chooseTab} className="sm:col-span-2 lg:col-span-full" />
    </form>
  );
}

export default function RecurringTab() {
  const {
    t,
    ui,
    accounts,
    categories,
    subcategories,
    displayCategories,
    categoryLabel,
    frequencyLabel,
    recurringDueLabel,
    displayedRecurringRules,
    recurringPayments,
    recurringType,
    setRecurringType,
    recurringAccountId,
    setRecurringAccountId,
    recurringCategoryId,
    setRecurringCategoryId,
    recurringSubcategoryId,
    setRecurringSubcategoryId,
    recurringAmount,
    setRecurringAmount,
    recurringName,
    setRecurringName,
    recurringFrequency,
    setRecurringFrequency,
    recurringNextDueOn,
    setRecurringNextDueOn,
    recurringAutoCreate,
    setRecurringAutoCreate,
    handleCreateRecurring,
    handleMarkRecurringPaid,
    handleDeleteRecurring,
    editingRecurringId,
    startEditingRecurring,
    savingRecurringId,
    visibleMonth,
    setVisibleMonth,
    selectedRecurringDate,
    setSelectedRecurringDate,
    recurringCalendarDays,
    formIssues,
    formAttempted,
    chooseTab
  } = useApp();

  const issues = formIssues.recurring;
  const showIssues = formAttempted("recurring");

  return (
    <Panel id="recurring" title={t.recurring} action={`${displayedRecurringRules.length} ${t.rules}`}>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
      <form onSubmit={handleCreateRecurring} noValidate className="mb-4 max-w-3xl rounded-lg border border-river/15 bg-river/5 p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold uppercase text-river">Add new recurring item</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${recurringType === "income" ? "bg-moss/12 text-moss" : "bg-coral/12 text-coral"}`}>
            {recurringType === "income" ? t.income : t.expense}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <select value={recurringType} onChange={(event) => setRecurringType(event.target.value as TransactionType)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
            <option value="expense">{t.expense}</option>
            <option value="income">{t.income}</option>
          </select>
          <input value={recurringAmount} onChange={(event) => setRecurringAmount(event.target.value)} aria-invalid={isMissing(issues, "amount", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "amount", showIssues) ? INVALID_FIELD : "border-ink/10"}`} inputMode="decimal" placeholder={t.amount} />
          <input value={recurringName} onChange={(event) => setRecurringName(event.target.value)} aria-invalid={isMissing(issues, "name", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm sm:col-span-2 lg:col-span-1 ${isMissing(issues, "name", showIssues) ? INVALID_FIELD : "border-ink/10"}`} placeholder="Name, e.g. Electricity bill" />
          <select value={recurringCategoryId} onChange={(event) => setRecurringCategoryId(event.target.value)} aria-invalid={isMissing(issues, "categoryId", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "categoryId", showIssues) ? INVALID_FIELD : "border-ink/10"}`}>
            {categories.some((category) => category.kind === recurringType) ? null : <option value="">No {recurringType} categories</option>}
            {categories.filter((category) => category.kind === recurringType).map((category) => (
              <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
            ))}
          </select>
          <select value={recurringSubcategoryId} onChange={(event) => setRecurringSubcategoryId(event.target.value)} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
            <option value="">No subcategory</option>
            {subcategories.filter((subcategory) => subcategory.categoryId === recurringCategoryId).map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
            ))}
          </select>
          <select value={recurringAccountId} onChange={(event) => setRecurringAccountId(event.target.value)} aria-invalid={isMissing(issues, "accountId", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "accountId", showIssues) ? INVALID_FIELD : "border-ink/10"}`}>
            {accounts.length > 0 ? null : <option value="">No accounts yet</option>}
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <select value={recurringFrequency} onChange={(event) => setRecurringFrequency(event.target.value as RecurringRule["frequency"])} className="h-11 rounded-lg border border-ink/10 bg-white px-3 text-sm">
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
          <input type="date" value={recurringNextDueOn} onChange={(event) => setRecurringNextDueOn(event.target.value)} aria-invalid={isMissing(issues, "nextDueOn", showIssues) || undefined} className={`h-11 rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "nextDueOn", showIssues) ? INVALID_FIELD : "border-ink/10"}`} />
          <label className="flex h-11 items-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm">
            <input type="checkbox" checked={recurringAutoCreate} onChange={(event) => setRecurringAutoCreate(event.target.checked)} />
            Auto-create
          </label>
          <FormAlert result={issues} show={showIssues} onFix={chooseTab} className="sm:col-span-2 lg:col-span-3" />
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-river px-4 text-sm font-semibold text-bright sm:col-span-2 lg:col-span-1">
            <Plus size={17} />
            Add
          </button>
        </div>
      </form>
      <div className="space-y-3">
        {displayedRecurringRules.map((rule) => {
          const isEditing = editingRecurringId === rule.id;
          const ruleCategory = displayCategories.find((category) => category.id === rule.categoryId);
          const ruleSubcategory = subcategories.find((subcategory) => subcategory.id === rule.subcategoryId);
          const ruleAccount = accounts.find((account) => account.id === rule.accountId);
          const matchedTransaction = recurringPayments[rule.id];
          const isPaid = Boolean(matchedTransaction);
          const paymentStatusLabel = isPaid ? (rule.type === "income" ? "Received" : "Paid") : rule.type === "income" ? "Not received" : "Unpaid";
          const paymentStatusTone = isPaid ? "bg-moss/12 text-moss" : "bg-coral/12 text-coral";
          const dueStatusTone = isPaid ? "bg-ink/5 text-ink/55" : rule.daysUntilDue < 0 ? "bg-coral/12 text-coral" : rule.daysUntilDue === 0 ? "bg-amber/15 text-amber" : "bg-ink/5 text-ink/55";
          const recurringActionClass = isPaid
            ? "h-10 rounded-lg border border-moss/20 bg-moss/10 px-3 text-sm font-semibold text-moss transition disabled:cursor-not-allowed"
            : "h-10 rounded-lg border border-ink/10 px-3 text-sm font-semibold text-ink/60 transition hover:bg-moss/10 hover:text-moss disabled:cursor-not-allowed disabled:opacity-45";
          return (
            <article key={rule.id} className={`rounded-lg border p-3 ${isEditing ? "border-river/25 bg-river/5" : "border-ink/10 bg-white"}`}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{rule.merchant}{ruleSubcategory ? ` / ${ruleSubcategory.name}` : ""}</p>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusTone}`}>
                      {isPaid ? <CheckCircle2 size={13} /> : <CircleAlert size={13} />}
                      {paymentStatusLabel}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${dueStatusTone}`}>
                      {matchedTransaction ? `Recorded ${format(parseISO(matchedTransaction.occurredOn), "MMM d")}` : recurringDueLabel(rule.daysUntilDue)}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${!matchedTransaction && rule.daysUntilDue < 0 ? "font-semibold text-coral" : "text-ink/55"}`}>
                    Due {format(parseISO(rule.nextDueOn), "MMM d, yyyy")} - {categoryLabel(ruleCategory?.name)} - {ruleAccount?.name} - {frequencyLabel(rule.frequency)}
                    {rule.autoCreate ? " - Auto-create" : ""}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1">
                  <strong className={`shrink-0 px-2 ${rule.type === "income" ? "text-moss" : "text-coral"}`}>{rule.type === "income" ? "+" : "-"}{currency.format(rule.amount)}</strong>
                  {!isEditing ? (
                    <>
                      <button type="button" onClick={() => handleMarkRecurringPaid(rule)} disabled={isPaid || savingRecurringId === rule.id} className={recurringActionClass}>
                        {savingRecurringId === rule.id ? "Recording" : isPaid ? paymentStatusLabel : rule.type === "income" ? "Record received" : "Mark paid"}
                      </button>
                      <button type="button" aria-label="Edit recurring item" onClick={() => startEditingRecurring(rule)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-river/10 hover:text-river">
                        <Pencil size={16} />
                      </button>
                      <button type="button" aria-label="Delete recurring item" onClick={() => handleDeleteRecurring(rule.id)} className="grid size-10 place-items-center rounded-lg text-ink/45 transition hover:bg-coral/10 hover:text-coral">
                        <Trash2 size={16} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
              {isEditing ? <RecurringEditor rule={rule} /> : null}
            </article>
          );
        })}
      </div>
        </div>
        <aside className="xl:sticky xl:top-4 xl:self-start">
          <MonthCalendar
            month={visibleMonth}
            selectedDate={selectedRecurringDate}
            summaries={recurringCalendarDays}
            variant="recurring"
            labels={ui}
            onMonthChange={(month) => {
              setVisibleMonth(month);
              setSelectedRecurringDate("");
            }}
            onDateSelect={setSelectedRecurringDate}
            onClearDate={() => setSelectedRecurringDate("")}
          />
        </aside>
      </div>
    </Panel>
  );
}
