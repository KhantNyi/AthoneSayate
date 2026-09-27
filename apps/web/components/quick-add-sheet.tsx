"use client";

import { Plus, X } from "lucide-react";
import { preciseCurrency } from "@athonesayate/shared/metrics";
import { isMissing } from "@/lib/validation";
import { useApp } from "./app-context";
import { FormAlert, INVALID_FIELD } from "./ui";
import { Modal } from "./modal";

export function QuickAddSheet() {
  const {
    t,
    quickAddOpen,
    setQuickAddOpen,
    handleQuickAdd,
    type,
    setType,
    amount,
    setAmount,
    quickAddCategories,
    categoryId,
    setCategoryId,
    quickAddSubcategories,
    subcategoryId,
    setSubcategoryId,
    accounts,
    accountId,
    setAccountId,
    occurredOn,
    setOccurredOn,
    notes,
    setNotes,
    isSaving,
    categoryLabel,
    formIssues,
    formAttempted,
    chooseTab
  } = useApp();

  const issues = formIssues.transaction;
  const showIssues = formAttempted("transaction");

  if (!quickAddOpen) {
    return null;
  }

  return (
    <Modal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} labelledBy="quick-add-title">
      <form
        onSubmit={handleQuickAdd}
        noValidate
        aria-busy={isSaving}
        className="liquid-sheet liquid-scroll w-full max-w-lg animate-sheet-in overflow-y-auto rounded-t-2xl border border-ink/10 p-5 shadow-lift sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="quick-add-title" className="font-display text-lg font-semibold">{t.quickAdd}</h2>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            aria-label="Close quick add"
            className="grid size-11 place-items-center rounded-lg text-ink/60 transition hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl border border-ink/10 bg-ink/[0.03] p-1">
          {(["expense", "income"] as const).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setType(kind)}
              aria-pressed={type === kind}
              className={`h-10 rounded-lg text-sm font-semibold transition ${
                type === kind
                  ? kind === "income"
                    ? "bg-moss text-bright shadow"
                    : "bg-coral text-bright shadow"
                  : "text-ink/55 hover:text-ink"
              }`}
            >
              {kind === "income" ? t.income : t.expense}
            </button>
          ))}
        </div>

        <label className="mb-5 block">
          <span className="mb-1 block text-xs font-semibold uppercase text-ink/45">{t.amount}</span>
          <div className={`flex items-baseline gap-2 border-b-2 pb-1 transition focus-within:border-river ${isMissing(issues, "amount", showIssues) ? "border-coral" : "border-ink/10"}`}>
            <span className="font-display text-3xl font-semibold text-ink/35">฿</span>
            <input
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-label={t.amount}
              aria-invalid={isMissing(issues, "amount", showIssues) || undefined}
              className="tnum w-full border-none bg-transparent font-display text-4xl font-semibold outline-none"
            />
          </div>
        </label>

        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase text-ink/45">{t.category}</span>
          {quickAddCategories.length === 0 ? (
            <p className="rounded-lg border border-amber/25 bg-amber/10 px-3 py-2 text-sm text-amber">
              You have no {type} categories yet — create one in Settings before recording {type === "income" ? "income" : "an expense"}.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-1.5">
            {quickAddCategories.map((category) => {
              const active = category.id === categoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    active ? "border-transparent text-bright shadow" : "border-ink/15 text-ink/70 hover:border-ink/35"
                  }`}
                  style={active ? { background: category.color } : undefined}
                >
                  <span className="size-2 rounded-full" style={{ background: active ? "rgba(255,255,255,0.85)" : category.color }} />
                  {categoryLabel(category.name)}
                </button>
              );
            })}
          </div>
        </div>

        {quickAddSubcategories.length > 0 ? (
          <div className="mb-4">
            <span className="mb-2 block text-xs font-semibold uppercase text-ink/45">Subcategory</span>
            <div className="flex flex-wrap gap-1.5">
              {quickAddSubcategories.map((subcategory) => {
                const active = subcategory.id === subcategoryId;
                return (
                  <button
                    key={subcategory.id}
                    type="button"
                  onClick={() => setSubcategoryId(subcategory.id)}
                  aria-pressed={active}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                      active ? "border-river/30 bg-river/12 text-river" : "border-ink/15 text-ink/60 hover:border-ink/35"
                    }`}
                  >
                    {subcategory.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-ink/45">{t.account}</span>
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              aria-invalid={isMissing(issues, "accountId", showIssues) || undefined}
              className={`h-11 w-full rounded-lg border bg-white px-3 text-sm ${isMissing(issues, "accountId", showIssues) ? INVALID_FIELD : "border-ink/10"}`}
            >
              {accounts.length > 0 ? null : <option value="">No accounts yet</option>}
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase text-ink/45">{t.date}</span>
            <input
              type="date"
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
              className="h-11 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm"
            />
          </label>
        </div>

        <input
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t.optionalNote}
          aria-label={t.optionalNote}
          className="mb-5 h-11 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm"
        />

        <FormAlert
          result={issues}
          show={showIssues}
          className="mb-3"
          onFix={(tab) => {
            chooseTab(tab);
            setQuickAddOpen(false);
          }}
        />

        <button
          disabled={isSaving}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-river to-indigo-500 text-sm font-semibold text-bright shadow-glow transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus size={18} />
          {isSaving ? "Saving..." : Number(amount) > 0 ? `${t.add} · ${preciseCurrency.format(Number(amount))}` : t.add}
        </button>
      </form>
    </Modal>
  );
}
