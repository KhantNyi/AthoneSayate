"use client";

import { createContext, useContext } from "react";
import type { useAppState } from "./use-app-state";

export type AppState = ReturnType<typeof useAppState>;

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ value, children }: { value: AppState; children: React.ReactNode }) {
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside <AppProvider>");
  }
  return context;
}
