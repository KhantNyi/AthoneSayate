import { CalendarClock, CircleDollarSign, LayoutDashboard, ReceiptText, Settings, Target, WalletCards } from "lucide-react";

export const navItems = [
  { key: "dashboard", label: "dashboard", icon: LayoutDashboard },
  { key: "transactions", label: "transactions", icon: ReceiptText },
  { key: "reports", label: "reports", icon: WalletCards },
  { key: "budgets", label: "budgets", icon: CircleDollarSign },
  { key: "recurring", label: "recurring", icon: CalendarClock },
  { key: "goals", label: "goals", icon: Target },
  { key: "settings", label: "category", icon: Settings }
] as const;

export type TabKey = (typeof navItems)[number]["key"];
