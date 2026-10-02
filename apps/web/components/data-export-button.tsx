"use client";

import { Download, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { format, startOfMonth } from "date-fns";
import { buildDataExport, exportFilename, exportTransactionsCsv, transactionsForExport, type ExportPeriod } from "@/lib/data-export";
import { useApp } from "./app-context";
import { Modal } from "./modal";

export function DataExportButton() {
  const app = useApp();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ExportPeriod["mode"]>("all");
  const [fromMonth, setFromMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [toMonth, setToMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [fromDate, setFromDate] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [fileFormat, setFileFormat] = useState<"json" | "csv">("json");
  const [message, setMessage] = useState("");
  const period: ExportPeriod = mode === "all" ? { mode } : { mode, from: mode === "months" ? fromMonth : fromDate, to: mode === "months" ? toMonth : toDate };
  let count = 0;
  let validation = "";
  try {
    count = transactionsForExport(app.transactions, period).length;
  } catch (error) {
    validation = error instanceof Error ? error.message : "Choose a valid period.";
  }
  const unavailable = app.isLoading || Boolean(app.dataError);

  function download(event: FormEvent) {
    event.preventDefault();
    if (validation || unavailable) return;
    setMessage("");
    try {
      const data = buildDataExport(app, period, {
        source: app.demoMode ? "demo" : "personal",
        usingCachedData: app.usingCachedData,
        pendingChanges: app.syncState.pending
      });
      const content = fileFormat === "json" ? JSON.stringify(data, null, 2) : exportTransactionsCsv(data);
      const blob = new Blob([content], { type: fileFormat === "json" ? "application/json;charset=utf-8" : "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFilename(data, fileFormat);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give mobile browsers time to start consuming the download.
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(`Download started: ${count} transaction${count === 1 ? "" : "s"}.`);
    } catch {
      setMessage("Couldn't create the export. Please try again.");
    }
  }

  const fieldClass = "h-11 w-full min-w-0 rounded-lg border border-ink/10 bg-white px-3 text-sm text-ink";
  return (
    <>
      <button type="button" disabled={unavailable} onClick={() => { setMessage(""); setOpen(true); }} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-river/25 bg-river/10 px-4 text-sm font-semibold text-river">
        <Download size={17} /> Export data
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={titleId}>
        <form onSubmit={download} noValidate className="liquid-sheet liquid-scroll w-full max-w-lg overflow-y-auto rounded-t-2xl border border-ink/10 p-5 sm:rounded-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-lg font-semibold">Export data</h2>
            <button type="button" autoFocus aria-label="Close data export" onClick={() => setOpen(false)} className="grid size-11 shrink-0 place-items-center rounded-lg text-ink/60"><X size={18} /></button>
          </div>
          <p className="mb-4 text-sm text-ink/55">Download your records to analyze with AI or a spreadsheet.</p>
          {app.demoMode ? <p className="mb-4 rounded-lg bg-amber/10 p-3 text-sm text-amber">You are viewing sample data. This export contains demo records.</p> : null}
          {app.usingCachedData || app.syncState.pending > 0 ? <p className="mb-4 text-sm text-ink/55">Includes data on this device, with {app.syncState.pending} change(s) waiting to sync.</p> : null}
          <div className="grid gap-4">
            <label className="grid gap-1 text-sm font-medium text-ink/65">
              Export period
              <select aria-label="Export period" value={mode} onChange={event => { setMode(event.target.value as ExportPeriod["mode"]); setMessage(""); }} className={fieldClass}>
                <option value="all">All data</option>
                <option value="months">Month to month</option>
                <option value="dates">Custom dates</option>
              </select>
            </label>
            {mode !== "all" ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="grid min-w-0 gap-1 text-sm font-medium text-ink/65">
                  {mode === "months" ? "From month" : "From date"}
                  <input type={mode === "months" ? "month" : "date"} value={mode === "months" ? fromMonth : fromDate} onChange={event => { (mode === "months" ? setFromMonth : setFromDate)(event.target.value); setMessage(""); }} aria-invalid={Boolean(validation)} className={fieldClass} />
                </label>
                <label className="grid min-w-0 gap-1 text-sm font-medium text-ink/65">
                  {mode === "months" ? "To month" : "To date"}
                  <input type={mode === "months" ? "month" : "date"} value={mode === "months" ? toMonth : toDate} onChange={event => { (mode === "months" ? setToMonth : setToDate)(event.target.value); setMessage(""); }} aria-invalid={Boolean(validation)} className={fieldClass} />
                </label>
              </div>
            ) : null}
            <label className="grid gap-1 text-sm font-medium text-ink/65">
              File format
              <select aria-label="File format" value={fileFormat} onChange={event => { setFileFormat(event.target.value as "json" | "csv"); setMessage(""); }} className={fieldClass}>
                <option value="json">JSON — for AI analysis</option>
                <option value="csv">CSV — transaction spreadsheet</option>
              </select>
            </label>
            <p className="text-xs leading-relaxed text-ink/55">
              {fileFormat === "json" ? "Includes income and expenses, totals by month, category, subcategory and account, monthly budgets, and current accounts, categories, recurring rules and goals." : "Includes income and expense rows with dates, amounts, currency, category, subcategory, account, merchant, notes and recurring payment details."}
              {" "}The selected period includes both start and end dates. Current settings in JSON are included for context across all periods.
            </p>
            <div aria-live="polite">
              {validation ? <p role="alert" className="text-sm text-coral">{validation}</p> : <p className="text-sm font-semibold">{count} transaction{count === 1 ? "" : "s"} selected{count === 0 ? " — no transactions in this period" : ""}</p>}
              {message ? <p role="status" className="mt-2 text-sm text-ink/65">{message}</p> : null}
            </div>
            <button type="submit" disabled={Boolean(validation) || unavailable} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-river px-4 text-sm font-semibold text-bright"><Download size={18} /> Download {fileFormat.toUpperCase()}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
