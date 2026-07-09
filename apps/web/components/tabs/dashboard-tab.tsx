"use client";

import { ArrowDownCircle, ArrowUpCircle, Banknote, PiggyBank, Plus } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { format, parseISO } from "date-fns";
import { currency, preciseCurrency } from "@athonesayate/shared/metrics";
import { compactCurrency } from "@/lib/helpers";
import { useApp } from "../app-context";
import { MonthCalendar } from "../month-calendar";
import { ActivityStat, DashboardPanel, MetricCard } from "../ui";

export default function DashboardTab() {
  const {
    t,
    ui,
    chart,
    balances,
    upcoming,
    recurringPayments,
    budgetRows,
    monthTotals,
    allTotals,
    comparison,
    daily,
    recurringDue,
    dashboardInsights,
    dashboardCategoryMonth,
    dashboardCalendarMonth,
    setDashboardCalendarMonth,
    dashboardConcentrationMonth,
    dashboardConcentrationRows,
    dashboardCalendarDays,
    dashboardMonthSummary,
    dashboardWeekSummary,
    dashboardSelectedSummary,
    selectedDashboardDate,
    setSelectedDashboardDate,
    openMonthlyCategoryReport,
    chooseTab,
    categoryLabel,
    recurringDueLabel,
    displayCategories,
    subcategories,
    categories,
    type,
    setType,
    amount,
    setAmount,
    occurredOn,
    setOccurredOn,
    notes,
    setNotes,
    categoryId,
    setCategoryId,
    canAddTransaction,
    isSaving,
    handleSubmit
  } = useApp();

  const accountTotal = balances.reduce((sum, account) => sum + account.balance, 0);
  const recurringDashboardItems = upcoming.filter((rule) => !recurringPayments[rule.id]);
  const recurringExpenseTotal = recurringDashboardItems.reduce((sum, rule) => sum + (rule.type === "expense" ? rule.amount : 0), 0);
  const categoryMixRows = budgetRows.filter((row) => row.spent > 0).slice(0, 6);

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ArrowDownCircle} label={t.monthIncome} value={monthTotals.income} sub={`${comparison.incomeDelta.toFixed(1)}% ${t.vsLastMonth}`} tone="moss" />
        <MetricCard icon={ArrowUpCircle} label={t.monthExpenses} value={monthTotals.expenses} sub={`${comparison.expenseDelta.toFixed(1)}% ${t.vsLastMonth}`} tone="coral" />
        <MetricCard icon={PiggyBank} label={t.netCashFlow} value={monthTotals.net} sub={`${currency.format(allTotals.net)} ${t.allTimeNet}`} tone="river" />
        <MetricCard icon={Banknote} label={t.accountBalance} value={accountTotal} sub={`${balances.length} ${t.activeAccounts}`} tone="river" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <DashboardPanel title={t.spendingPace} action="This month">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_116px]">
            <div className="h-56 min-w-0 lg:h-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={daily} margin={{ bottom: 4, left: -12, right: 10, top: 16 }}>
                  <defs>
                    <linearGradient id="liquidSpentGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor={chart.expense} stopOpacity={0.34} />
                      <stop offset="95%" stopColor={chart.expense} stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} width={46} />
                  <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} {...chart.tooltip} />
                  <Area type="monotone" dataKey="spent" stroke={chart.expense} fill="url(#liquidSpentGradient)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="grid gap-2 text-sm lg:content-center">
              <ActivityStat label="Projected" value={currency.format(monthTotals.expenses + recurringDue)} tone="ink" compact />
              <ActivityStat label="Budget" value={currency.format(budgetRows.reduce((sum, row) => sum + (row.monthlyBudget ?? 0), 0))} tone="ink" compact />
              <ActivityStat label="Spent" value={currency.format(monthTotals.expenses)} tone="river" compact />
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title={t.categoryMix} action="By amount">
          <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)] md:items-center">
            <div className="relative h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie innerRadius={48} outerRadius={74} paddingAngle={3} data={categoryMixRows} dataKey="spent" nameKey="name" stroke="rgb(var(--surface) / 0.72)" strokeWidth={2}>
                    {categoryMixRows.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => preciseCurrency.format(Number(value))} {...chart.tooltip} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <p className="tnum text-sm font-semibold">{currency.format(monthTotals.expenses)}</p>
                  <p className="text-[11px] uppercase text-ink/45">Total</p>
                </div>
              </div>
            </div>
            <div className="grid gap-1.5">
              {categoryMixRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => openMonthlyCategoryReport(row.id, dashboardCategoryMonth)}
                  className="grid grid-cols-[minmax(0,1fr)_42px_82px] items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-river/10"
                >
                  <span className="inline-flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="truncate">{categoryLabel(row.name)}</span>
                  </span>
                  <span className="text-right text-ink/55">{dashboardInsights.totalSpent > 0 ? `${((row.spent / dashboardInsights.totalSpent) * 100).toFixed(0)}%` : "0%"}</span>
                  <span className="tnum text-right text-ink/65">{currency.format(row.spent)}</span>
                </button>
              ))}
            </div>
          </div>
        </DashboardPanel>
      </div>

      <DashboardPanel title={ui.activityCalendar} action={format(dashboardCalendarMonth, "MMM yyyy")}>
        <div className="mb-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <ActivityStat label={ui.monthSpent} value={currency.format(dashboardMonthSummary.expense)} tone="coral" />
          <ActivityStat label={ui.monthIncome} value={currency.format(dashboardMonthSummary.income)} tone="moss" />
          <ActivityStat label="Net" value={currency.format(dashboardMonthSummary.income - dashboardMonthSummary.expense)} tone={dashboardMonthSummary.income - dashboardMonthSummary.expense >= 0 ? "moss" : "coral"} />
          <ActivityStat label={ui.dueThisMonth} value={`${dashboardMonthSummary.recurringCount}`} sub={currency.format(dashboardMonthSummary.dueAmount)} tone="amber" />
        </div>
        <MonthCalendar
          month={dashboardCalendarMonth}
          selectedDate={selectedDashboardDate}
          summaries={dashboardCalendarDays}
          variant="activity"
          labels={ui}
          embedded
          onMonthChange={(month) => {
            setDashboardCalendarMonth(month);
            setSelectedDashboardDate("");
          }}
          onDateSelect={setSelectedDashboardDate}
          onClearDate={() => setSelectedDashboardDate("")}
        />
        <div className="mt-3 grid gap-2 text-sm lg:grid-cols-2">
          <div className="rounded-xl border border-ink/10 bg-white/45 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-ink/45">{ui.selectedWeek}</p>
            <div className="grid grid-cols-2 gap-2">
              <ActivityStat label={ui.spending} value={currency.format(dashboardWeekSummary.expense)} tone="coral" compact />
              <ActivityStat label={t.income} value={currency.format(dashboardWeekSummary.income)} tone="moss" compact />
              <ActivityStat label={ui.avgDay} value={currency.format(dashboardWeekSummary.expense / 7)} tone="ink" compact />
              <ActivityStat label={t.entries} value={`${dashboardWeekSummary.count}`} tone="ink" compact />
            </div>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white/45 p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-ink/45">{ui.selectedDay}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs uppercase text-ink/45">{t.date}</p>
                <p className="truncate font-semibold">{selectedDashboardDate ? format(parseISO(selectedDashboardDate), "MMM d") : ui.none}</p>
              </div>
              <ActivityStat label={ui.spending} value={currency.format(dashboardSelectedSummary?.expense ?? 0)} tone="coral" compact />
              <ActivityStat label={t.income} value={currency.format(dashboardSelectedSummary?.income ?? 0)} tone="moss" compact />
              <ActivityStat label={ui.due} value={`${dashboardSelectedSummary?.recurringCount ?? 0}`} tone="amber" compact />
            </div>
          </div>
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_1fr]">
        <DashboardPanel title="Category concentration" action={format(dashboardConcentrationMonth, "MMM yyyy")}>
          <div className="grid gap-4">
            {dashboardConcentrationRows.slice(0, 6).map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => openMonthlyCategoryReport(row.id, dashboardConcentrationMonth)}
                className="rounded-xl px-1 py-1 text-left transition hover:bg-river/10"
              >
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="inline-flex min-w-0 items-center gap-2 font-medium">
                    <span className="size-3 shrink-0 rounded-full" style={{ background: row.color }} />
                    <span className="truncate">{categoryLabel(row.name)}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <strong>{row.share.toFixed(0)}%</strong>
                    <span className="ml-2 text-xs text-ink/45">{currency.format(row.spent)}</span>
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-ink/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-river to-blue-500" style={{ width: `${Math.min(row.share, 100)}%` }} />
                </div>
              </button>
            ))}
            {dashboardConcentrationRows.length === 0 ? <p className="text-sm text-ink/45">{ui.noSpendingRecorded}</p> : null}
            <p className="text-xs text-ink/45">Share is based on actual spending by category this month.</p>
          </div>
        </DashboardPanel>

        <DashboardPanel
          title={ui.recurringDue}
          action={
            <button
              type="button"
              onClick={() => chooseTab("recurring")}
              className="rounded-lg border border-ink/10 bg-white/55 px-3 py-1.5 text-xs font-medium text-ink/60 transition hover:bg-river/10 hover:text-river"
            >
              View all
            </button>
          }
        >
          <div className="grid gap-2">
            <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
              {recurringDashboardItems.length > 0 ? recurringDashboardItems.map((rule) => {
              const ruleCategory = displayCategories.find((category) => category.id === rule.categoryId);
              const ruleSubcategory = subcategories.find((subcategory) => subcategory.id === rule.subcategoryId);

              return (
                <article key={rule.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-ink/10 bg-white/60 px-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{rule.merchant}</p>
                    <p className="truncate text-xs text-ink/45">{ruleSubcategory?.name ?? categoryLabel(ruleCategory?.name) ?? t.recurring}</p>
                  </div>
                  <div className="text-right">
                    <p className={`tnum font-semibold ${rule.type === "income" ? "text-moss" : "text-coral"}`}>{rule.type === "income" ? "+" : "-"}{currency.format(rule.amount)}</p>
                    <p className="text-xs text-amber">{recurringDueLabel(rule.daysUntilDue)}</p>
                  </div>
                </article>
              );
            }) : (
              <p className="rounded-xl border border-ink/10 bg-white/50 p-3 text-sm text-ink/50">No recurring items due this month.</p>
            )}
            </div>
            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="font-semibold">Expense due</span>
              <strong className="tnum">{currency.format(recurringExpenseTotal)}</strong>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title={t.quickAdd} action={type === "income" ? t.income : t.expense}>
          <form onSubmit={handleSubmit} className="grid gap-3">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-ink/10 bg-white/45 p-1">
              {(["expense", "income"] as const).map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setType(kind)}
                  className={`h-9 rounded-lg text-xs font-semibold transition ${
                    type === kind ? "bg-river text-bright shadow-glow" : "text-ink/55 hover:bg-river/10 hover:text-river"
                  }`}
                >
                  {kind === "income" ? t.income : t.expense}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input value={notes} onChange={(event) => setNotes(event.target.value)} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2" placeholder="Coffee, Groceries" />
              <input value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" inputMode="decimal" placeholder={preciseCurrency.format(0)} />
              <input type="date" value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm" />
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="h-10 rounded-lg border border-ink/10 bg-white px-3 text-sm sm:col-span-2">
                {categories.filter((category) => category.kind === type).map((category) => (
                  <option key={category.id} value={category.id}>{categoryLabel(category.name)}</option>
                ))}
              </select>
            </div>
            <button disabled={!canAddTransaction} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-river to-blue-600 text-sm font-semibold text-bright shadow-glow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45">
              <Plus size={17} />
              {isSaving ? "Saving" : type === "income" ? "Add income" : "Add expense"}
            </button>
          </form>
        </DashboardPanel>
      </div>
    </div>
  );
}
