"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, CircleAlert, Loader2, WalletCards } from "lucide-react";
import { sendPasswordReset, signInWithPassword, signUpWithPassword } from "@athonesayate/shared/supabase";

type Mode = "signIn" | "signUp" | "reset";

const titles: Record<Mode, string> = {
  signIn: "Welcome back",
  signUp: "Create your account",
  reset: "Reset your password"
};

const subtitles: Record<Mode, string> = {
  signIn: "Sign in to your expense tracker.",
  signUp: "Track spending, budgets, bills, and goals in one place.",
  reset: "We'll email you a link to set a new password."
};

export function AuthScreen({ onBack, initialMode = "signIn" }: { onBack?: () => void; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Enter your email address.");
      return;
    }

    if (mode !== "reset" && password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setBusy(true);

    try {
      if (mode === "signIn") {
        await signInWithPassword(trimmedEmail, password);
        // The auth listener in useSession swaps the UI; nothing to do here.
      } else if (mode === "signUp") {
        const { needsConfirmation } = await signUpWithPassword(trimmedEmail, password, displayName.trim() || undefined);
        if (needsConfirmation) {
          setNotice(`Check ${trimmedEmail} for a confirmation link, then sign in.`);
          setMode("signIn");
          setPassword("");
        }
      } else {
        await sendPasswordReset(trimmedEmail, `${window.location.origin}/`);
        setNotice(`If an account exists for ${trimmedEmail}, a reset link is on its way.`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="liquid-ui grid min-h-screen place-items-center px-5 py-12 text-ink">
      <div className="w-full max-w-sm">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-ink/55 transition hover:text-river"
          >
            <ArrowLeft size={15} />
            Back to demo
          </button>
        ) : null}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-river to-indigo-500 text-bright shadow-glow">
            <WalletCards size={26} />
          </div>
          <p className="mt-4 bg-gradient-to-r from-river to-indigo-500 bg-clip-text font-display text-2xl font-bold tracking-tight text-transparent">
            athonesayate
          </p>
          <h1 className="mt-5 font-display text-xl font-semibold">{titles[mode]}</h1>
          <p className="mt-1 text-sm text-ink/55">{subtitles[mode]}</p>
        </div>

        <form onSubmit={handleSubmit} className="liquid-chrome rounded-2xl border border-ink/10 bg-white p-5 shadow-sm">
          {mode === "signUp" ? (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-medium text-ink/60">Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                placeholder="Optional"
                className="w-full rounded-xl border border-ink/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-river"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink/60">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-xl border border-ink/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-river"
            />
          </label>

          {mode !== "reset" ? (
            <label className="mt-4 block">
              <span className="mb-1.5 block text-xs font-medium text-ink/60">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signUp" ? "new-password" : "current-password"}
                required
                minLength={8}
                className="w-full rounded-xl border border-ink/15 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-river"
              />
            </label>
          ) : null}

          {error ? (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-600">
              <CircleAlert size={14} className="mt-px shrink-0" />
              {error}
            </p>
          ) : null}

          {notice ? (
            <p className="mt-4 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700">{notice}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-river to-indigo-500 px-4 py-2.5 text-sm font-semibold text-bright shadow-glow disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            {mode === "signIn" ? "Sign in" : mode === "signUp" ? "Create account" : "Send reset link"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-2 text-xs text-ink/55">
          {mode === "signIn" ? (
            <>
              <button type="button" onClick={() => switchMode("signUp")} className="hover:text-river">
                No account yet? <span className="font-semibold text-river">Create one</span>
              </button>
              <button type="button" onClick={() => switchMode("reset")} className="hover:text-river">
                Forgot your password?
              </button>
            </>
          ) : (
            <button type="button" onClick={() => switchMode("signIn")} className="hover:text-river">
              Back to <span className="font-semibold text-river">sign in</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
