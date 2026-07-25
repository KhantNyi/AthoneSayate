import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// One client per tab. The data layer calls this on every query, and each
// createClient() call spins up its own auth instance with its own refresh
// timer; several of them racing over the same stored token causes spurious
// sign-outs. Keep it a singleton.
let browserClient: SupabaseClient | null = null;

function readBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

export function getSupabaseClient(): SupabaseClient | null {
  if (browserClient) {
    return browserClient;
  }

  const config = readBrowserConfig();

  if (!config) {
    return null;
  }

  browserClient = createClient(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "athonesayate-auth"
    }
  });

  return browserClient;
}

/**
 * Server-only client for scheduled work that has no user session. Uses the
 * service-role key, which bypasses row-level security, so it must never be
 * imported into anything that reaches the browser.
 */
export function createSupabaseServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    throw new Error(error.message);
  }

  return data.user;
}

export async function signUpWithPassword(email: string, password: string, displayName?: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: displayName ? { data: { display_name: displayName } } : undefined
  });

  if (error) {
    throw new Error(error.message);
  }

  // With email confirmation enabled the user exists but has no session yet.
  return { user: data.user, needsConfirmation: !data.session };
}

/** `redirectTo` is supplied by the caller; this package is built without DOM types. */
export async function sendPasswordReset(email: string, redirectTo?: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return;
  }

  await supabase.auth.signOut();
}

/** @deprecated Use getSupabaseClient(); kept so older imports keep compiling. */
export const createSupabaseBrowserClient = getSupabaseClient;
