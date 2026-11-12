import { CalendarClock, ChartPie, CircleDollarSign, House, ListChecks, ReceiptText, Settings, Target } from "lucide-react";

/** Every screen. Only some are top-level destinations: see `navItems`. */
export const tabs = {
  dashboard: { label: "home", icon: House },
  transactions: { label: "activity", icon: ReceiptText },
  reports: { label: "insights", icon: ChartPie },
  budgets: { label: "budgets", icon: CircleDollarSign },
  recurring: { label: "recurring", icon: CalendarClock },
  goals: { label: "goals", icon: Target },
  settings: { label: "settings", icon: Settings }
} as const;

export type TabKey = keyof typeof tabs;

/** The three planning screens share one destination and switch by segment. */
export const planTabs = ["budgets", "recurring", "goals"] as const satisfies readonly TabKey[];

/**
 * Top-level destinations, in dock and sidebar order. Settings is deliberately
 * absent: it is set up once and lives behind the header menu.
 */
export const navItems = [
  { key: "dashboard", label: "home", icon: House, tabs: ["dashboard"] },
  { key: "transactions", label: "activity", icon: ReceiptText, tabs: ["transactions"] },
  { key: "plan", label: "plan", icon: ListChecks, tabs: planTabs },
  { key: "reports", label: "insights", icon: ChartPie, tabs: ["reports"] }
] as const satisfies readonly { key: string; label: string; icon: unknown; tabs: readonly TabKey[] }[];

export type NavKey = (typeof navItems)[number]["key"];
