"use client";

import { useRef } from "react";
import { flushSync } from "react-dom";

/**
 * Shared motion helpers. Everything here degrades to an instant change:
 * browsers without View Transitions, reduced-motion users and devices without
 * a vibration motor all get the same result, just without the flourish.
 */

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Names a screen change for CSS. The kind lands on `<html data-vt>` while the
 * transition runs, so each kind styles its own `::view-transition-*` pseudos.
 */
export type TransitionKind = "nav-forward" | "nav-back" | "subu-open" | "subu-close" | "month-forward" | "month-back";

let running: ViewTransition | null = null;
/** Which transition last named each scope, so a skipped one can't strip a newer one's name. */
const scopeOwner = new WeakMap<HTMLElement, ViewTransition>();

/** The kind of transition being captured right now, if any. */
export const activeTransition = () =>
  typeof document === "undefined" ? undefined : (document.documentElement.dataset.vt as TransitionKind | undefined);

/**
 * Applies a React state change inside a same-document View Transition. The
 * update is flushed synchronously so the browser snapshots the finished DOM.
 *
 * `scope` names one element `month-scope` for the duration, so a month change
 * slides only the content that depends on the month. It must be the same DOM
 * node before and after the update.
 */
export function runViewTransition(update: () => void, kind: TransitionKind, scope?: Element | null): Promise<void> {
  if (typeof document === "undefined" || !document.startViewTransition || prefersReducedMotion()) {
    update();
    return Promise.resolve();
  }
  // A new change wins: jump the previous one to its end state.
  running?.skipTransition();
  const root = document.documentElement;
  root.dataset.vt = kind;
  const named = scope instanceof HTMLElement ? scope : null;
  if (named) named.style.viewTransitionName = "month-scope";
  const transition = document.startViewTransition(() => flushSync(update));
  running = transition;
  if (named) scopeOwner.set(named, transition);
  const clear = () => {
    if (named && scopeOwner.get(named) === transition) {
      named.style.viewTransitionName = "";
      scopeOwner.delete(named);
    }
    if (running !== transition) return;
    running = null;
    delete root.dataset.vt;
  };
  transition.finished.then(clear, clear);
  // Resolves once the new state is in the DOM, even if the animation is skipped.
  return transition.updateCallbackDone.catch(() => {});
}

const PATTERNS = { tap: 8, success: [12, 50, 18], warning: [18, 60, 18] } as const;

/** A short buzz on devices that support it (Android). iOS Safari has no web vibration API. */
export function haptic(kind: keyof typeof PATTERNS = "tap") {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[kind] as number | number[]);
  } catch {
    // Some browsers throw without a user gesture; the buzz is optional.
  }
}

/**
 * Plays a row's exit (slide aside, then fold its space away) before the
 * caller removes it from state, so the list closes the gap smoothly.
 */
export function leaveThen(element: Element | null, remove: () => void, restored?: () => void) {
  if (!(element instanceof HTMLElement) || prefersReducedMotion()) {
    remove();
    return;
  }
  // Already on its way out: a second tap must not delete twice.
  if (element.dataset.leaving) return;
  element.dataset.leaving = "true";
  const height = element.offsetHeight;
  const tableRow = element instanceof HTMLTableRowElement;
  const gap = tableRow ? 0 : parseFloat(getComputedStyle(element.parentElement ?? element).rowGap) || 0;
  const keyframes: Keyframe[] = tableRow
    ? [{ opacity: 1 }, { opacity: 0 }]
    : [
        { opacity: 1, transform: "none", height: `${height}px`, marginBottom: "0px" },
        { opacity: 0, transform: "translateX(24px) scale(0.98)", height: `${height}px`, marginBottom: "0px", offset: 0.45 },
        { opacity: 0, transform: "translateX(24px) scale(0.98)", height: "0px", marginBottom: `${-gap}px`, paddingTop: "0px", paddingBottom: "0px", borderWidth: "0px" }
      ];
  element.style.overflow = "hidden";
  element.style.pointerEvents = "none";
  const animation = element.animate(keyframes, { duration: tableRow ? 180 : 360, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" });
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    remove();
    // If the row survived (the removal was refused), bring it back.
    window.setTimeout(() => {
      if (!element.isConnected) return;
      animation.cancel();
      element.style.overflow = "";
      element.style.pointerEvents = "";
      delete element.dataset.leaving;
      restored?.();
    }, 400);
  };
  animation.finished.then(finish, finish);
}

const FRESH_FOR_MS = 900;

/**
 * Tells which ids just arrived, so a list can greet them with an entrance.
 * Pass every id the list could show (not only the visible page), otherwise
 * filtering would make old rows look new. The first non-empty set and any
 * bulk arrival (a reload or sync) count as already seen.
 */
export function useFreshIds(ids: readonly string[]) {
  const firstSeen = useRef<Map<string, number> | null>(null);
  const now = Date.now();
  if (firstSeen.current === null) {
    if (ids.length > 0) firstSeen.current = new Map(ids.map((id) => [id, 0]));
    return () => false;
  }
  const seen = firstSeen.current;
  const added = ids.filter((id) => !seen.has(id));
  const stamp = added.length <= 3 ? now : 0;
  for (const id of added) seen.set(id, stamp);
  return (id: string) => {
    const at = seen.get(id) ?? 0;
    return at > 0 && now - at < FRESH_FOR_MS;
  };
}

/** A month change as a slide: later months come in from the end, earlier from the start. */
export function slideMonth(from: Date, to: Date, update: () => void, scope?: Element | null) {
  const step = to.getFullYear() * 12 + to.getMonth() - (from.getFullYear() * 12 + from.getMonth());
  if (step === 0) {
    update();
    return;
  }
  void runViewTransition(update, step > 0 ? "month-forward" : "month-back", scope);
}

/* Where the coin for the next save celebration takes off from: the save
   button's centre, captured at submit time because the sheet closes before
   the celebration renders. Read once. */
let coinOrigin: { x: number; y: number } | null = null;

export function launchCoinFrom(origin: { x: number; y: number } | null) {
  coinOrigin = origin;
}

export function takeCoinOrigin() {
  const origin = coinOrigin;
  coinOrigin = null;
  return origin;
}
