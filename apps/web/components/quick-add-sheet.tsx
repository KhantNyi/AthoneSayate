"use client";

import { Plus, X } from "lucide-react";
import { preciseCurrency } from "@athonesayate/shared/metrics";
import { useApp } from "./app-context";

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
    canAddTransaction,
    isSaving,
    categoryLabel
  } = useApp();

  if (!quickAddOpen) {
    return null;
  }

  return (
    <div
      className="liquid-overlay fixed inset-0 z-50 flex animate-fade-in items-end justify-center sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          setQuickAddOpen(false);
        }
      }}
    >
      <form
        onSubmit={handleQuickAdd}
        className="liquid-sheet liquid-scroll max-h-[92vh] w-full max-w-lg animate-sheet-in overflow-y-auto rounded-t-2xl border border-ink/10 bg-white p-5 shadow-lift sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">{t.quickAdd}</h2>
          <button
            type="button"
            onClick={() => setQuickAddOpen(false)}
            aria-label="Close quick add"
            className="grid size-9 place-items-center rounded-lg text-ink/50 transition hover:bg-ink/5 hover:text-ink"
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
          <div className="flex items-baseline gap-2 border-b-2 border-ink/10 pb-1 transition focus-within:border-river">
            <span className="font-display text-3xl font-semibold text-ink/35">฿</span>
            <input
              autoFocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-label={t.amount}
              className="tnum w-full border-none bg-transparent font-display text-4xl font-semibold outline-none"
            />
          </div>
        </label>

        <div className="mb-4">
          <span className="mb-2 block text-xs font-semibold uppercase text-ink/45">{t.category}</span>
          <div className="flex flex-wrap gap-1.5">
            {quickAddCategories.map((category) => {
              const active = category.id === categoryId;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
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
              className="h-11 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm"
            >
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
          className="mb-5 h-11 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm"
        />

        <button
          disabled={!canAddTransaction}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-river to-indigo-500 text-sm font-semibold text-bright shadow-glow transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Plus size={18} />
          {isSaving ? "Saving..." : Number(amount) > 0 ? `${t.add} · ${preciseCurrency.format(Number(amount))}` : t.add}
        </button>
      </form>
    </div>
  );
}
