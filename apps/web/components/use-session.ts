"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient, signOut as remoteSignOut } from "@athonesayate/shared/supabase";
import { clearStoredData, setActiveUser } from "@/lib/offline-data";
import { disablePushNotifications } from "@/lib/push";

export type SessionStatus = "loading" | "signedIn" | "signedOut" | "unconfigured";

export type Session = {
  status: SessionStatus;
  userId: string | null;
  email: string | null;
  signOut: () => Promise<void>;
};

export function useSession(): Session {
  const [status, setStatus] = useState<SessionStatus>("loading");
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Tracked separately from state so sign-out can purge the *previous* user's
  // storage after React has already cleared it.
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setStatus("unconfigured");
      return;
    }

    let cancelled = false;

    const apply = (nextUserId: string | null, nextEmail: string | null) => {
      if (cancelled) {
        return;
      }
      // Bind storage before any consumer mounts and starts reading the cache.
      setActiveUser(nextUserId);
      currentUserId.current = nextUserId;
      setUserId(nextUserId);
      setEmail(nextEmail);
      setStatus(nextUserId ? "signedIn" : "signedOut");
    };

    void supabase.auth.getSession().then(({ data }) => {
      apply(data.session?.user.id ?? null, data.session?.user.email ?? null);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session?.user.id ?? null, session?.user.email ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const leavingUserId = currentUserId.current;

    // Release the push subscription first. Endpoints are globally unique, so a
    // row left behind under this user would block the next user on this device
    // from registering the same endpoint.
    try {
      await disablePushNotifications();
    } catch {
      // best effort: a stale endpoint is cleaned up by the dispatcher on 404/410
    }

    await remoteSignOut();

    // Cached snapshot and any queued writes belong to the user who is leaving.
    clearStoredData(leavingUserId);
    setActiveUser(null);
  }, []);

  return { status, userId, email, signOut };
}
