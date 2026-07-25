"use client";

import { Loader2 } from "lucide-react";
import { AuthScreen } from "./auth-screen";
import { ExpenseTrackerApp } from "./expense-tracker-app";
import { useSession } from "./use-session";

/**
 * Decides between the auth screen and the app.
 *
 * ExpenseTrackerApp is only mounted once a session exists, because useAppState
 * fetches the whole dataset on mount and the offline cache is keyed by user id.
 * Keying it on userId also forces a full remount when the account changes, so
 * no state from the previous user survives.
 */
export function AppGate() {
  const session = useSession();

  if (session.status === "loading") {
    return (
      <main className="liquid-ui grid min-h-screen place-items-center text-ink">
        <Loader2 size={22} className="animate-spin text-ink/40" />
      </main>
    );
  }

  if (session.status === "unconfigured") {
    return (
      <main className="liquid-ui grid min-h-screen place-items-center px-6 text-center text-ink">
        <div className="max-w-sm">
          <h1 className="font-display text-lg font-semibold">Supabase is not configured</h1>
          <p className="mt-2 text-sm text-ink/60">
            Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then reload.
          </p>
        </div>
      </main>
    );
  }

  if (session.status === "signedOut" || !session.userId) {
    return <AuthScreen />;
  }

  return <ExpenseTrackerApp key={session.userId} session={session} />;
}
