"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, endOfWeek, format, isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths } from "date-fns";
import { currency } from "@athonesayate/shared/metrics";
import { buildCalendarGrid, type CalendarDaySummary } from "@/lib/calendar-utils";
import { compactCurrency } from "@/lib/helpers";
import type { UiTranslations } from "@/lib/i18n";

export function MonthCalendar({
  month,
  selectedDate,
  summaries,
  variant,
  labels,
  embedded = false,
  onMonthChange,
  onDateSelect,
  onClearDate
}: {
  month: Date;
  selectedDate: string;
  summaries: Record<string, CalendarDaySummary>;
  variant: "transactions" | "recurring" | "activity";
  labels: UiTranslations;
  embedded?: boolean;
  onMonthChange: (month: Date) => void;
  onDateSelect: (date: string) => void;
  onClearDate: () => void;
}) {
  const days = buildCalendarGrid(month);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const maxDailyExpense = days.reduce((max, day) => {
    const expense = summaries[format(day, "yyyy-MM-dd")]?.expense ?? 0;
    return expense > max ? expense : max;
  }, 0);
  const selectedSummary = selectedDate ? summaries[selectedDate] : undefined;
  const selectedWeekStart = selectedDate ? startOfWeek(parseISO(selectedDate)) : undefined;
  const selectedWeekEnd = selectedDate ? endOfWeek(parseISO(selectedDate)) : undefined;

  return (
    <section className={embedded ? "rounded-xl border border-ink/10 bg-white/45 p-3" : "liquid-card rounded-lg border border-ink/10 bg-white p-3"}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase text-ink/65">{variant === "recurring" ? labels.recurringDue : labels.monthlyActivity}</h3>
          <p className="mt-1 text-xs text-ink/45">
            {selectedDate
              ? `${format(parseISO(selectedDate), "MMM d, yyyy")} selected${selectedSummary?.count || selectedSummary?.recurringCount || selectedSummary?.paidRecurringCount ? "" : " - no items"}`
              : variant === "activity" ? labels.scanActivityMonth : labels.pickDayToFilter}
          </p>
        </div>
        <div className="inline-flex flex-wrap items-center gap-1">
          <button type="button" onClick={() => onMonthChange(startOfMonth(subMonths(month, 1)))} className="relative grid size-9 place-items-center rounded-lg border border-ink/10 text-transparent transition hover:bg-river/10 hover:text-transparent" aria-label="Previous month">
            <ChevronLeft size={17} className="absolute text-ink/55" />
            ‹
          </button>
          <span className="min-w-28 text-center text-sm font-semibold">{format(month, "MMM yyyy")}</span>
          <button type="button" onClick={() => onMonthChange(startOfMonth(addMonths(month, 1)))} className="relative grid size-9 place-items-center rounded-lg border border-ink/10 text-transparent transition hover:bg-river/10 hover:text-transparent" aria-label="Next month">
            <ChevronRight size={17} className="absolute text-ink/55" />
            ›
          </button>
          {selectedDate ? (
            <button type="button" onClick={onClearDate} className="ml-1 h-9 rounded-lg border border-ink/10 px-3 text-xs font-semibold text-ink/55 transition hover:bg-ink/5 hover:text-ink">
              {labels.clear}
            </button>
          ) : null}
        </div>
      </div>
      {variant === "activity" ? (
        <div className="mb-2 flex flex-wrap gap-2 text-xs text-ink/55">
          <span className="inline-flex flex-wrap items-center gap-1"><span className="size-2 rounded-full bg-coral" /> {labels.spending}</span>
          <span className="inline-flex flex-wrap items-center gap-1"><span className="size-2 rounded-full bg-moss" /> {labels.incomeLegend}</span>
          <span className="inline-flex flex-wrap items-center gap-1"><span className="rounded bg-amber/15 px-1.5 py-0.5 font-semibold text-amber">{labels.due}</span> {labels.recurringDue}</span>
        </div>
      ) : null}
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-ink/40">
        {weekdays.map((weekday) => (
          <span key={weekday} className="py-1">{weekday}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const summary = summaries[key];
          const selected = selectedDate === key;
          const inMonth = isSameMonth(day, month);
          const hasData = Boolean(summary?.count || summary?.recurringCount || summary?.paidRecurringCount);
          const intensity = summary?.expense && maxDailyExpense > 0 ? Math.sqrt(summary.expense / maxDailyExpense) : 0;
          const inSelectedWeek = Boolean(selectedWeekStart && selectedWeekEnd && day >= selectedWeekStart && day <= selectedWeekEnd);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onDateSelect(key)}
              aria-label={`${format(day, "MMMM d, yyyy")}, spent ${currency.format(summary?.expense ?? 0)}, income ${currency.format(summary?.income ?? 0)}, ${summary?.recurringCount ?? 0} bills due`}
              aria-pressed={selected}
              className={`min-w-0 min-h-16 rounded-lg border p-1 text-left transition sm:min-h-20 sm:p-1.5 ${
                selected
                  ? "border-river bg-river/10 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.14)]"
                  : variant === "activity" && inSelectedWeek
                    ? "border-river/25 bg-river/5"
                  : hasData
                    ? "border-ink/10 bg-white hover:border-river/35 hover:bg-river/5"
                    : "border-transparent bg-ink/[0.025] hover:bg-ink/[0.04]"
              } ${inMonth ? "text-ink" : "text-ink/30"}`}
              style={variant === "activity" && intensity > 0 && !selected ? { background: `rgb(var(--coral) / ${(0.06 + intensity * 0.3).toFixed(3)})` } : undefined}
            >
              <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${isToday(day) ? "bg-ink text-paper" : ""}`}>
                {format(day, "d")}
              </span>
              {variant === "activity" ? (
                <span className="mt-1 block space-y-0.5">
                  {summary?.expense ? <span className="block truncate text-[11px] font-semibold text-coral">{compactCurrency(summary.expense)}</span> : null}
                  <span className="flex min-h-4 flex-wrap items-center gap-1">
                    {summary?.income ? <span className="rounded bg-moss/10 px-1 text-[10px] font-semibold text-moss">+</span> : null}
                    {summary?.recurringCount ? <span className="rounded bg-amber/15 px-1 text-[10px] font-semibold text-amber">{labels.due}</span> : null}
                  </span>
                </span>
              ) : variant === "transactions" ? (
                <span className="mt-1 block space-y-0.5">
                  {summary?.expense ? <span className="block truncate text-[11px] font-semibold text-coral">-{currency.format(summary.expense)}</span> : null}
                  {summary?.income ? <span className="block truncate text-[11px] font-semibold text-moss">+{currency.format(summary.income)}</span> : null}
                  {summary?.count ? <span className="block text-[10px] text-ink/45">{summary.count} entries</span> : null}
                </span>
              ) : (
                <span className="mt-1 block space-y-0.5">
                  {summary?.recurringCount ? <span className="block text-[11px] font-semibold text-coral">{summary.recurringCount} due</span> : null}
                  {summary?.paidRecurringCount ? <span className="block text-[11px] font-semibold text-moss">{summary.paidRecurringCount} paid</span> : null}
                  {summary?.dueAmount ? <span className="block truncate text-[10px] text-ink/55">{currency.format(summary.dueAmount)}</span> : null}
                  {summary?.paidAmount ? <span className="block truncate text-[10px] text-moss/75">{currency.format(summary.paidAmount)}</span> : null}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
