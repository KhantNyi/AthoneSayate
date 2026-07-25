"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { setDemoMode } from "@/lib/offline-data";
import { AuthScreen } from "./auth-screen";
import { ExpenseTrackerApp } from "./expense-tracker-app";
import { useSession } from "./use-session";

/**
 * Decides between the demo, the auth screen, and the real app.
 *
 * A signed-out visitor lands in a read-only demo backed by bundled sample data
 * rather than an auth wall, and is prompted to sign up on the first write.
 *
 * ExpenseTrackerApp only mounts once the mode is settled, because useAppState
 * fetches its dataset on mount. The key forces a full remount whenever the
 * account changes, so no state survives across users or across demo-to-real.
 */
export function AppGate() {
  const session = useSession();
  const [authMode, setAuthMode] = useState<"signIn" | "signUp" | null>(null);
  const showAuth = authMode !== null;

  const isDemo = session.status === "signedOut" || (session.status !== "loading" && !session.userId);

  // Set during render, not in an effect: a child's effects run before its
  // parent's, so useAppState would otherwise start its first fetch against
  // Supabase before this flag was set. Writing a module-level boolean during
  // render is idempotent and safe to repeat.
  setDemoMode(isDemo);

  // A completed sign-in should drop the auth screen.
  useEffect(() => {
    if (session.userId) {
      setAuthMode(null);
    }
  }, [session.userId]);

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

  if (isDemo && showAuth) {
    return <AuthScreen initialMode={authMode} onBack={() => setAuthMode(null)} />;
  }

  return (
    <ExpenseTrackerApp
      key={session.userId ?? "demo"}
      session={session}
      onRequestAuth={isDemo ? (mode) => setAuthMode(mode ?? "signIn") : undefined}
    />
  );
}
