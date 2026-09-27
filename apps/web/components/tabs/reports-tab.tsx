"use client";

import { Modal } from "../modal";
import { Fragment } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { currency, preciseCurrency } from "@athonesayate/shared/metrics";
import { compactCurrency } from "@/lib/helpers";
import { useApp } from "../app-context";
import { ActivityStat, MonthField, Panel } from "../ui";

export default function ReportsTab() {
  const {
    ui,
    chart,
    accounts,
    subcategories,
    displayCategories,
    categoryLabel,
    monthlyReportMonth,
    changeMonthlyReportMonth,
    monthlyReportMode,
    setMonthlyReportMode,
    monthlyCompareMonth,
    setMonthlyCompareMonth,
    monthlyReportCategoryId,
    setMonthlyReportCategoryId,
    monthlyReportSubcategoryId,
    setMonthlyReportSubcategoryId,
    monthlyReportAccountId,
    setMonthlyReportAccountId,
    monthlyReportRecurringFilter,
    setMonthlyReportRecurringFilter,
    monthlyReportQuery,
    setMonthlyReportQuery,
    monthlyReportFiltersOpen,
    setMonthlyReportFiltersOpen,
    monthlyReportFilterCount,
    monthlyReportFilterChips,
    clearMonthlyReportFilters,
    monthlyReportSubcategories,
    monthlyReportFilteredTx,
    monthlyReportTotal,
    monthlyReportDays,
    monthlyReportActiveDays,
    monthlyReportBudgetTotal,
    monthlyReportDaily,
    monthlyReportCategoryRows,
    monthlyReportSubcategoryRows,
    monthlyReportAccountRows,
    monthlyReportTrendSeries,
    monthlyReportComparisonRows,
    monthlyComparisonCurrentTotal,
    monthlyComparisonCompareTotal,
    monthlyComparisonDelta,
    monthlyComparisonDeltaPercent,
    monthlyComparisonMaxSpend
  } = useApp();

  return (
    <Panel title="Monthly expense report" action={format(monthlyReportMonth, "MMMM yyyy")}>
      <div className="mb-4 hidden min-w-0 gap-3 md:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <MonthField label={ui.month} month={monthlyReportMonth} onChange={changeMonthlyReportMonth} />
        <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <select
            value={monthlyReportCategoryId}
            onChange={(event) => {
              setMonthlyReportCategoryId(event.target.value);
              setMonthlyReportSubcategoryId("all");
            }}
            className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            aria-label="Report category"
          >
            <option value="all">All categories</option>
            {displayCategories.filter((category) => category.kind === "expense").map((category) => (
              <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
            ))}
          </select>
          <select
            value={monthlyReportSubcategoryId}
            onChange={(event) => setMonthlyReportSubcategoryId(event.target.value)}
            className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            aria-label="Report subcategory"
          >
            <option value="all">All subcategories</option>
            {monthlyReportSubcategories.map((subcategory) => (
              <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
            ))}
          </select>
          <select
            value={monthlyReportAccountId}
            onChange={(event) => setMonthlyReportAccountId(event.target.value)}
            className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            aria-label="Report account"
          >
            <option value="all">All accounts</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <select
            value={monthlyReportRecurringFilter}
            onChange={(event) => setMonthlyReportRecurringFilter(event.target.value as "all" | "recurring" | "manual")}
            className="h-10 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm"
            aria-label="Report recurring filter"
          >
            <option value="all">All entries</option>
            <option value="recurring">Recurring only</option>
            <option value="manual">Manual only</option>
          </select>
        </div>
      </div>

      <div className="mb-4 grid gap-3 md:hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <MonthField label={ui.month} month={monthlyReportMonth} onChange={changeMonthlyReportMonth} />
          <button
            type="button"
            onClick={() => setMonthlyReportFiltersOpen(true)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-3 text-sm font-semibold text-ink/65"
          >
            <SlidersHorizontal size={17} />
            Filters{monthlyReportFilterCount ? ` ${monthlyReportFilterCount}` : ""}
          </button>
        </div>
        <label className="relative block min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
          <input
            value={monthlyReportQuery}
            onChange={(event) => setMonthlyReportQuery(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink/10 bg-white pl-10 pr-3 text-sm"
            placeholder="Search expenses"
            aria-label="Search monthly expenses"
          />
        </label>
        {monthlyReportFilterChips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {monthlyReportFilterChips.map((chip) => (
              <span key={chip} className="rounded-lg bg-river/10 px-2.5 py-1 text-xs font-semibold text-river">{chip}</span>
            ))}
            <button type="button" onClick={clearMonthlyReportFilters} className="rounded-lg px-2.5 py-1 text-xs font-semibold text-ink/55">
              Clear
            </button>
          </div>
        ) : null}
      </div>

      <div className="mb-4 hidden flex-col gap-2 md:flex sm:flex-row">
        <label className="relative block min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" size={18} />
          <input
            value={monthlyReportQuery}
            onChange={(event) => setMonthlyReportQuery(event.target.value)}
            className="h-10 w-full rounded-lg border border-ink/10 bg-white pl-10 pr-3 text-sm"
            placeholder="Search merchant, note, category, subcategory, account"
            aria-label="Search monthly expenses"
          />
        </label>
        <button
          type="button"
          onClick={clearMonthlyReportFilters}
          className="h-10 rounded-lg border border-ink/10 bg-white px-4 text-sm font-semibold text-ink/60 transition hover:bg-ink/[0.04] hover:text-ink"
        >
          Clear filters
        </button>
      </div>

      {monthlyReportFiltersOpen ? (
        <Modal open={monthlyReportFiltersOpen} onClose={() => setMonthlyReportFiltersOpen(false)} labelledBy="report-filters-title">
          <div className="liquid-sheet liquid-scroll w-full max-w-lg overflow-y-auto rounded-t-2xl border p-5 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id="report-filters-title" className="text-base font-semibold">Report filters</h3>
                <p className="text-xs text-ink/45">{format(monthlyReportMonth, "MMM yyyy")}</p>
              </div>
              <button
                type="button"
                aria-label="Close report filters"
                onClick={() => setMonthlyReportFiltersOpen(false)}
                className="grid size-10 place-items-center rounded-lg text-ink/45"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-ink/55">
                Category
                <select
                  value={monthlyReportCategoryId}
                  onChange={(event) => {
                    setMonthlyReportCategoryId(event.target.value);
                    setMonthlyReportSubcategoryId("all");
                  }}
                  className="h-11 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink"
                >
                  <option value="all">All categories</option>
                  {displayCategories.filter((category) => category.kind === "expense").map((category) => (
                    <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-ink/55">
                Subcategory
                <select
                  value={monthlyReportSubcategoryId}
                  onChange={(event) => setMonthlyReportSubcategoryId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink"
                >
                  <option value="all">All subcategories</option>
                  {monthlyReportSubcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-ink/55">
                Account
                <select
                  value={monthlyReportAccountId}
                  onChange={(event) => setMonthlyReportAccountId(event.target.value)}
                  className="h-11 w-full rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink"
                >
                  <option value="all">All accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid gap-1 text-sm font-medium text-ink/55">
                Entries
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-ink/10 bg-white p-1">
                  {([
                    ["all", "All"],
                    ["recurring", "Recurring"],
                    ["manual", "Manual"]
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMonthlyReportRecurringFilter(value)}
                      className={`h-9 rounded-md text-xs font-semibold transition ${
                        monthlyReportRecurringFilter === value ? "bg-river text-bright" : "text-ink/55"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  type="button"
                  onClick={clearMonthlyReportFilters}
                  className="h-11 rounded-lg border border-ink/10 bg-white px-4 text-sm font-semibold text-ink/60"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setMonthlyReportFiltersOpen(false)}
                  className="h-11 rounded-lg bg-river px-4 text-sm font-semibold text-bright"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex h-10 w-full items-center rounded-lg border border-ink/10 bg-white p-1 sm:w-auto">
          {(["overview", "compare"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMonthlyReportMode(mode)}
              className={`h-8 flex-1 rounded-md px-4 text-sm font-semibold capitalize transition sm:flex-none ${
                monthlyReportMode === mode ? "bg-river text-bright" : "text-ink/55 hover:bg-river/10 hover:text-river"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
        {monthlyReportMode === "compare" ? (
          <MonthField label="Compare to" month={monthlyCompareMonth} onChange={setMonthlyCompareMonth} />
        ) : null}
      </div>

      {monthlyReportMode === "overview" ? (
        <Fragment>
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <ActivityStat label="Total expenses" value={currency.format(monthlyReportTotal)} tone="coral" />
        <ActivityStat label="Average/day" value={currency.format(monthlyReportTotal / Math.max(monthlyReportDays, 1))} sub={`${monthlyReportActiveDays} active days`} tone="ink" />
        <ActivityStat label="Budget remaining" value={currency.format(Math.max(monthlyReportBudgetTotal - monthlyReportTotal, 0))} sub={`${currency.format(monthlyReportBudgetTotal)} planned`} tone={monthlyReportBudgetTotal >= monthlyReportTotal ? "moss" : "coral"} />
        <ActivityStat label="Transactions" value={`${monthlyReportFilteredTx.length}`} sub={`${monthlyReportCategoryRows.length} categories`} tone="ink" />
      </div>

      <div className="grid min-w-0 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="min-w-0 text-sm font-semibold uppercase text-ink/55">Daily expenses</h3>
            <span className="shrink-0 text-xs font-semibold text-ink/45">{format(monthlyReportMonth, "MMM yyyy")}</span>
          </div>
          <div className="h-56 min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyReportDaily} margin={{ bottom: 4, left: -18, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="monthlyReportDailyGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor={chart.expense} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={chart.expense} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} width={52} />
                <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} {...chart.tooltip} />
                <Area type="monotone" dataKey="spent" stroke={chart.expense} fill="url(#monthlyReportDailyGradient)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="min-w-0 text-sm font-semibold uppercase text-ink/55">6-month expense trend</h3>
            <span className="shrink-0 text-xs font-semibold text-ink/45">{currency.format(monthlyReportTrendSeries.reduce((sum, item) => sum + item.expenses, 0))}</span>
          </div>
          <div className="h-56 min-w-0 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyReportTrendSeries} margin={{ bottom: 4, left: -18, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} width={52} />
                <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} cursor={{ fill: chart.grid }} {...chart.tooltip} />
                <Bar dataKey="expenses" fill={chart.expense} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 xl:grid-cols-3">
        <div className="min-w-0 rounded-lg border border-ink/10 bg-white p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase text-ink/55">Top categories</h3>
          <div className="space-y-3">
            {monthlyReportCategoryRows.slice(0, 6).map((row) => {
              const share = monthlyReportTotal > 0 ? (row.spent / monthlyReportTotal) * 100 : 0;

              return (
                <div key={row.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                      <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                      <span className="truncate font-medium">{categoryLabel(row.name)}</span>
                    </span>
                    <span className="shrink-0 text-right font-semibold">{currency.format(row.spent)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                    <div className="h-full rounded-full bg-coral" style={{ width: `${Math.min(share, 100)}%` }} />
                  </div>
                </div>
              );
            })}
            {monthlyReportCategoryRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-ink/10 bg-white p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase text-ink/55">Top subcategories</h3>
          <div className="space-y-3">
            {monthlyReportSubcategoryRows.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{row.name}</span>
                    <span className="block truncate text-xs text-ink/45">{categoryLabel(row.categoryName)} - {row.count} entries</span>
                  </span>
                </span>
                <strong className="shrink-0 text-right">{currency.format(row.spent)}</strong>
              </div>
            ))}
            {monthlyReportSubcategoryRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
          </div>
        </div>

        <div className="min-w-0 rounded-lg border border-ink/10 bg-white p-3">
          <h3 className="mb-3 text-sm font-semibold uppercase text-ink/55">Accounts used</h3>
          <div className="space-y-3">
            {monthlyReportAccountRows.slice(0, 6).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="inline-flex min-w-0 flex-1 items-center gap-2">
                  <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{row.name}</span>
                    <span className="block text-xs text-ink/45">{row.count} entries</span>
                  </span>
                </span>
                <strong className="shrink-0 text-right">{currency.format(row.spent)}</strong>
              </div>
            ))}
            {monthlyReportAccountRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-4 min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-3 py-3">
          <h3 className="text-sm font-semibold uppercase text-ink/55">Monthly transactions</h3>
          <span className="text-xs font-semibold text-ink/45">{monthlyReportFilteredTx.length} entries</span>
        </div>
        <div className="divide-y divide-ink/10 md:hidden">
          {monthlyReportFilteredTx.slice(0, 50).map((tx) => {
            const category = displayCategories.find((item) => item.id === tx.categoryId);
            const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
            const account = accounts.find((item) => item.id === tx.accountId);

            return (
              <article key={tx.id} className="grid gap-2 px-3 py-3 text-sm">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{categoryLabel(category?.name)}{subcategory ? ` / ${subcategory.name}` : ""}</p>
                    <p className="text-xs text-ink/45">{format(parseISO(tx.occurredOn), "MMM d")} - {account?.name ?? "-"}</p>
                  </div>
                  <strong className="shrink-0 text-right text-coral">-{preciseCurrency.format(tx.amount)}</strong>
                </div>
                <p className="truncate text-xs text-ink/55">{tx.notes || tx.merchant || "-"}</p>
              </article>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-ink/[0.03] text-xs uppercase text-ink/45">
              <tr>
                <th className="px-3 py-2 font-semibold">Date</th>
                <th className="px-3 py-2 font-semibold">Category</th>
                <th className="px-3 py-2 font-semibold">Account</th>
                <th className="px-3 py-2 font-semibold">Note</th>
                <th className="px-3 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {monthlyReportFilteredTx.slice(0, 50).map((tx) => {
                const category = displayCategories.find((item) => item.id === tx.categoryId);
                const subcategory = subcategories.find((item) => item.id === tx.subcategoryId);
                const account = accounts.find((item) => item.id === tx.accountId);

                return (
                  <tr key={tx.id} className="border-t border-ink/10">
                    <td className="px-3 py-2 text-ink/65">{format(parseISO(tx.occurredOn), "MMM d")}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: category?.color ?? "#64748b" }} />
                        <span className="truncate">{categoryLabel(category?.name)}{subcategory ? ` / ${subcategory.name}` : ""}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-ink/65">{account?.name ?? "-"}</td>
                    <td className="max-w-[260px] truncate px-3 py-2 text-ink/55">{tx.notes || tx.merchant || "-"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-coral">-{preciseCurrency.format(tx.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {monthlyReportFilteredTx.length === 0 ? <p className="px-3 py-4 text-sm text-ink/45">{ui.noExpenseTransactions}</p> : null}
      </div>
        </Fragment>
      ) : (
        <Fragment>
          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <ActivityStat label={format(monthlyReportMonth, "MMM yyyy")} value={currency.format(monthlyComparisonCurrentTotal)} sub="Current month" tone="coral" />
            <ActivityStat label={format(monthlyCompareMonth, "MMM yyyy")} value={currency.format(monthlyComparisonCompareTotal)} sub="Comparison month" tone="ink" />
            <ActivityStat
              label="Difference"
              value={`${monthlyComparisonDelta >= 0 ? "+" : ""}${currency.format(monthlyComparisonDelta)}`}
              sub={`${monthlyComparisonDeltaPercent >= 0 ? "+" : ""}${monthlyComparisonDeltaPercent.toFixed(0)}%`}
              tone={monthlyComparisonDelta > 0 ? "coral" : monthlyComparisonDelta < 0 ? "moss" : "ink"}
            />
            <ActivityStat
              label={monthlyReportCategoryId === "all" ? "Compared categories" : "Compared subcategories"}
              value={`${monthlyReportComparisonRows.length}`}
              sub={monthlyReportCategoryId === "all" ? "category rows" : "subcategory rows"}
              tone="ink"
            />
          </div>

          <div className="min-w-0 overflow-hidden rounded-lg border border-ink/10 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-3 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold uppercase text-ink/55">
                  {monthlyReportCategoryId === "all" ? "Category comparison" : "Subcategory comparison"}
                </h3>
                <p className="mt-1 text-xs text-ink/45">
                  {format(monthlyReportMonth, "MMM yyyy")} vs {format(monthlyCompareMonth, "MMM yyyy")}
                </p>
              </div>
              <span className="text-xs font-semibold text-ink/45">{monthlyReportComparisonRows.length} rows</span>
            </div>

            <div className="divide-y divide-ink/10 md:hidden">
              {monthlyReportComparisonRows.map((row) => {
                const currentWidth = (row.currentSpent / monthlyComparisonMaxSpend) * 100;
                const compareWidth = (row.compareSpent / monthlyComparisonMaxSpend) * 100;
                const deltaTone = row.deltaAmount > 0 ? "text-coral" : row.deltaAmount < 0 ? "text-moss" : "text-ink/55";
                const deltaLabel = row.compareSpent === 0 && row.currentSpent > 0 ? "New" : `${row.deltaPercent >= 0 ? "+" : ""}${row.deltaPercent.toFixed(0)}%`;

                return (
                  <article key={row.id} className="grid gap-3 px-3 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                        <span className="truncate font-semibold">{categoryLabel(row.name)}</span>
                      </span>
                      <span className={`shrink-0 text-right font-semibold ${deltaTone}`}>
                        {row.deltaAmount >= 0 ? "+" : ""}{currency.format(row.deltaAmount)}
                      </span>
                    </div>
                    <div className="grid gap-2">
                      <div>
                        <div className="mb-1 flex justify-between gap-2 text-xs text-ink/45">
                          <span>{format(monthlyReportMonth, "MMM")}</span>
                          <span>{currency.format(row.currentSpent)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                          <div className="h-full rounded-full bg-coral" style={{ width: `${currentWidth}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 flex justify-between gap-2 text-xs text-ink/45">
                          <span>{format(monthlyCompareMonth, "MMM")}</span>
                          <span>{currency.format(row.compareSpent)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                          <div className="h-full rounded-full bg-river" style={{ width: `${compareWidth}%` }} />
                        </div>
                      </div>
                    </div>
                    <p className={`text-xs font-semibold ${deltaTone}`}>{deltaLabel}</p>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-[820px] w-full text-left text-sm">
                <thead className="bg-ink/[0.03] text-xs uppercase text-ink/45">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{monthlyReportCategoryId === "all" ? "Category" : "Subcategory"}</th>
                    <th className="px-3 py-2 text-right font-semibold">{format(monthlyReportMonth, "MMM yyyy")}</th>
                    <th className="px-3 py-2 text-right font-semibold">{format(monthlyCompareMonth, "MMM yyyy")}</th>
                    <th className="px-3 py-2 text-right font-semibold">Difference</th>
                    <th className="px-3 py-2 text-right font-semibold">Change</th>
                    <th className="px-3 py-2 font-semibold">Spend shape</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyReportComparisonRows.map((row) => {
                    const currentWidth = (row.currentSpent / monthlyComparisonMaxSpend) * 100;
                    const compareWidth = (row.compareSpent / monthlyComparisonMaxSpend) * 100;
                    const deltaTone = row.deltaAmount > 0 ? "text-coral" : row.deltaAmount < 0 ? "text-moss" : "text-ink/55";
                    const deltaLabel = row.compareSpent === 0 && row.currentSpent > 0 ? "New" : `${row.deltaPercent >= 0 ? "+" : ""}${row.deltaPercent.toFixed(0)}%`;

                    return (
                      <tr key={row.id} className="border-t border-ink/10">
                        <td className="px-3 py-2">
                          <span className="inline-flex min-w-0 items-center gap-2">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                            <span className="truncate font-medium">{categoryLabel(row.name)}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-coral">{currency.format(row.currentSpent)}</td>
                        <td className="px-3 py-2 text-right text-ink/65">{currency.format(row.compareSpent)}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${deltaTone}`}>
                          {row.deltaAmount >= 0 ? "+" : ""}{currency.format(row.deltaAmount)}
                        </td>
                        <td className={`px-3 py-2 text-right font-semibold ${deltaTone}`}>{deltaLabel}</td>
                        <td className="px-3 py-2">
                          <div className="grid gap-1">
                            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                              <div className="h-full rounded-full bg-coral" style={{ width: `${currentWidth}%` }} />
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-ink/10">
                              <div className="h-full rounded-full bg-river" style={{ width: `${compareWidth}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {monthlyReportComparisonRows.length === 0 ? <p className="px-3 py-4 text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
          </div>
        </Fragment>
      )}
    </Panel>
  );
}
