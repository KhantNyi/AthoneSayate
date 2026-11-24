"use client";

import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPopupMotion, useAnimatedPresence } from "./glass-motion";
import { activeTransition, haptic } from "./motion";

let openModals = 0;
let restoreBody: (() => void) | undefined;

/** Native top-layer dialogs stay above transformed cards and make the page inert. */
export function Modal({ open, onClose, labelledBy, children, centered = false }: {
  open: boolean;
  /** `reason` is "drag" when the sheet was swiped away, which has already animated most of its exit. */
  onClose: (reason?: "drag") => void;
  labelledBy: string;
  children: ReactNode;
  centered?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const backdropPressed = useRef(false);
  const { present, finishExit } = useAnimatedPresence(open);
  const motion = useRef<ReturnType<typeof createPopupMotion> | null>(null);
  const entered = useRef(false);
  const touchedField = useRef<HTMLElement | null>(null);
  const touchReleaseFrame = useRef(0);
  const openRef = useRef(open);
  const onCloseRef = useRef(onClose);
  /** Release speed (px/ms) of a swipe that dismissed the sheet; the exit keeps that momentum. */
  const flingVelocity = useRef<number | null>(null);
  useLayoutEffect(() => {
    openRef.current = open;
    onCloseRef.current = onClose;
  });
  const bottomSheet = useCallback(() => !centered && window.matchMedia("(max-width: 639px)").matches, [centered]);
  const exitPose = useCallback(() => ({
    transform: bottomSheet() ? `translateY(${(ref.current?.querySelector<HTMLElement>(".liquid-sheet")?.offsetHeight ?? 0) + 2}px)` : "translateY(12px) scale(0.98)",
    opacity: "0"
  }), [bottomSheet]);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!present || !dialog) return;
    const trigger = document.activeElement;
    const title = document.getElementById(labelledBy);
    const initialFocus = dialog.contains(title) ? title : null;
    const previousTabIndex = initialFocus?.getAttribute("tabindex") ?? null;
    const previousAutofocus = initialFocus?.getAttribute("autofocus") ?? null;
    // Native dialog autofocus runs during showModal. Choose static content
    // before opening so Safari never focuses a field and pans the viewport.
    initialFocus?.setAttribute("tabindex", "-1");
    initialFocus?.setAttribute("autofocus", "");
    if (openModals++ === 0) {
      const { scrollX, scrollY } = window;
      const body = document.body;
      const previous = { overflow: body.style.overflow, position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width };
      // overflow:hidden alone does not stop iOS from panning the page on focus.
      // Fixed boxes size against the whole window, scrollbar strip included.
      // Pin the body to the width it had so the page doesn't widen behind the sheet.
      const width = `${document.documentElement.clientWidth}px`;
      Object.assign(body.style, { overflow: "hidden", position: "fixed", top: `${-scrollY}px`, left: `${-scrollX}px`, width });
      restoreBody = () => {
        Object.assign(body.style, previous);
        window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      };
    }
    const viewport = window.visualViewport;
    let previousHeight = -1;
    let previousTop = -1;
    let previousWidth = -1;
    const resize = () => {
      const height = viewport?.height ?? window.innerHeight;
      const top = viewport?.offsetTop ?? 0;
      const width = window.innerWidth;
      // WebKit emits resize on showModal even when the bounds did not change.
      // Treating that notification as a keyboard change cancels the entrance.
      if (height === previousHeight && top === previousTop && width === previousWidth) return;
      previousHeight = height;
      previousTop = top;
      previousWidth = width;
      // Settle before keyboard panning can use translated focus bounds.
      motion.current?.settleEntrance();
      dialog.style.setProperty("--modal-height", `${height}px`);
      dialog.style.setProperty("--modal-top", `${top}px`);
      motion.current?.retargetExit(exitPose());
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    // Set the visible bounds and lock scrolling before native dialog focus runs.
    dialog.showModal();
    initialFocus?.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    dialog.querySelector<HTMLElement>(".liquid-sheet")?.scrollTo({ top: 0, behavior: "instant" });
    resize();
    const sheet = dialog.querySelector<HTMLElement>(".liquid-sheet");
    if (sheet) motion.current = createPopupMotion(sheet, dialog);
    entered.current = false;
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
      motion.current?.destroy();
      motion.current = null;
      touchedField.current = null;
      cancelAnimationFrame(touchReleaseFrame.current);
      dialog.close();
      if (initialFocus) {
        if (previousTabIndex === null) initialFocus.removeAttribute("tabindex");
        else initialFocus.setAttribute("tabindex", previousTabIndex);
        if (previousAutofocus === null) initialFocus.removeAttribute("autofocus");
        else initialFocus.setAttribute("autofocus", previousAutofocus);
      }
      if (--openModals === 0) {
        restoreBody?.();
        restoreBody = undefined;
      }
      const parent = trigger instanceof HTMLElement ? trigger.closest("dialog") : null;
      if (trigger instanceof HTMLElement && trigger.isConnected && (!parent || (parent.open && parent.dataset.state !== "closing" && !parent.inert))) {
        trigger.focus({ preventScroll: true });
      }
    };
  }, [present, labelledBy, exitPose]);

  useLayoutEffect(() => {
    if (!present) return;
    touchedField.current = null;
    cancelAnimationFrame(touchReleaseFrame.current);
    if (!motion.current) { if (!open) finishExit(); return; }
    const sheet = ref.current?.querySelector<HTMLElement>(".liquid-sheet");
    if (!sheet) return;
    const style = getComputedStyle(sheet);
    const from = exitPose();
    const fling = open ? null : flingVelocity.current;
    flingVelocity.current = null;
    // A view transition is animating this change already: land in place so
    // it snapshots the sheet at rest instead of mid-slide.
    const handedOff = activeTransition() !== undefined;
    let duration = open ? (bottomSheet() ? 320 : 240) : (bottomSheet() ? 220 : 180);
    let easing = open ? style.getPropertyValue("--ease-ios").trim() || "cubic-bezier(0.32, 0.72, 0, 1)" : "cubic-bezier(0.4, 0, 1, 1)";
    if (fling !== null) {
      // Finish the swipe at (at least) the speed the finger left it.
      const remaining = Math.max(sheet.offsetHeight - new DOMMatrixReadOnly(getComputedStyle(sheet).transform).m42, 0);
      duration = Math.min(Math.max(remaining / Math.max(fling, 0.9), 120), 280);
      easing = "cubic-bezier(0.2, 0.6, 0.35, 1)";
    }
    motion.current.play({
      open,
      from: entered.current ? undefined : from,
      to: open ? { transform: "none", opacity: "1" } : from,
      duration: handedOff ? 0 : duration,
      easing,
      onFinish: open ? undefined : finishExit
    });
    entered.current = true;
  }, [open, present, bottomSheet, exitPose, finishExit]);

  // Swipe down to dismiss a bottom sheet. Touch events rather than pointer
  // events: once the browser claims a pan for scrolling it cancels pointer
  // streams, while a non-passive touchmove can still keep the gesture.
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!present || !dialog || centered) return;
    const sheet = dialog.querySelector<HTMLElement>(".liquid-sheet");
    if (!sheet) return;
    type Sample = { y: number; t: number };
    let start: { x: number; y: number } | null = null;
    let dragging = false;
    let offset = 0;
    let armed = false;
    let samples: Sample[] = [];
    let suppressClick = 0;
    const scrolledAbove = (target: EventTarget | null) => {
      for (let node = target instanceof Element ? target : null; node && node !== dialog; node = node.parentElement) {
        if (node.scrollTop > 0) return true;
      }
      return false;
    };
    const backdrop = (value: number) => dialog.style.setProperty("--modal-backdrop-opacity", String(value));
    const reset = () => {
      start = null;
      dragging = false;
      armed = false;
      samples = [];
    };
    const touchstart = (event: TouchEvent) => {
      reset();
      if (!openRef.current || !bottomSheet() || event.touches.length !== 1) return;
      const target = event.target;
      if (!(target instanceof Element) || !sheet.contains(target)) return;
      if (target.closest("input, textarea, select, [contenteditable='true'], [data-no-drag]") || scrolledAbove(target)) return;
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
      samples = [{ y: touch.clientY, t: event.timeStamp }];
    };
    const touchmove = (event: TouchEvent) => {
      if (!start || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (!dragging) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        // Upward or sideways: that is scrolling or a carousel, not a dismissal.
        if (dy <= 0 || Math.abs(dx) > Math.abs(dy) || scrolledAbove(event.target)) {
          start = null;
          return;
        }
        dragging = true;
        motion.current?.settleEntrance();
        start = { x: touch.clientX, y: touch.clientY };
      }
      if (event.cancelable) event.preventDefault();
      const travel = touch.clientY - start.y;
      // Past the top the sheet resists, approaching ~40px however far it is pulled.
      offset = travel >= 0 ? travel : -(40 * -travel) / (40 + -travel);
      const height = sheet.offsetHeight || 1;
      sheet.style.transform = `translateY(${offset}px)`;
      backdrop(Math.max(1 - Math.max(offset, 0) / height, 0.15));
      const past = offset > height * 0.3;
      if (past !== armed) {
        armed = past;
        if (past) haptic("tap");
      }
      samples.push({ y: touch.clientY, t: event.timeStamp });
      while (samples.length > 2 && event.timeStamp - samples[0].t > 100) samples.shift();
    };
    const release = (cancelled: boolean) => {
      if (!dragging) {
        reset();
        return;
      }
      const first = samples[0];
      const last = samples[samples.length - 1];
      const velocity = first && last && last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
      const height = sheet.offsetHeight || 1;
      const dismiss = !cancelled && (offset > height * 0.3 || (velocity > 0.45 && offset > 16));
      suppressClick = window.setTimeout(() => { suppressClick = 0; }, 350);
      reset();
      if (dismiss) {
        flingVelocity.current = Math.max(velocity, 0);
        onCloseRef.current("drag");
        return;
      }
      const spring = getComputedStyle(sheet).getPropertyValue("--ease-spring").trim() || "cubic-bezier(0.34, 1.36, 0.44, 1)";
      motion.current?.play({ open: true, to: { transform: "none", opacity: "1" }, duration: 380, easing: spring });
    };
    const touchend = () => release(false);
    const touchcancel = () => release(true);
    // A drag that ends over a button must not also press it.
    const click = (event: MouseEvent) => {
      if (!suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
    };
    dialog.addEventListener("touchstart", touchstart, { passive: true });
    dialog.addEventListener("touchmove", touchmove, { passive: false });
    dialog.addEventListener("touchend", touchend);
    dialog.addEventListener("touchcancel", touchcancel);
    dialog.addEventListener("click", click, true);
    return () => {
      window.clearTimeout(suppressClick);
      dialog.removeEventListener("touchstart", touchstart);
      dialog.removeEventListener("touchmove", touchmove);
      dialog.removeEventListener("touchend", touchend);
      dialog.removeEventListener("touchcancel", touchcancel);
      dialog.removeEventListener("click", click, true);
    };
  }, [present, centered, bottomSheet]);

  const settleBeforeInput = (target: EventTarget) => {
    if (open && window.matchMedia("(pointer: coarse)").matches && target instanceof Element && target.closest("input, select, textarea, [contenteditable='true']")) {
      motion.current?.settleEntrance();
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      data-state={open ? "open" : "closing"}
      className={`glass-dialog ${centered ? "glass-dialog-centered" : ""}`}
      onPointerDownCapture={(event) => {
        if (!open || !window.matchMedia("(pointer: coarse)").matches || !(event.target instanceof Element)) return;
        const field = event.target.closest("input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [contenteditable='true']") ?? event.target.closest("label")?.control;
        // Keep the contact target still until click hit-testing has completed.
        if (field instanceof HTMLElement && motion.current?.holdEntrance()) touchedField.current = field;
      }}
      onMouseDownCapture={(event) => {
        // The subsequent trusted click focuses against the final bounds.
        if (touchedField.current) event.preventDefault();
      }}
      onClickCapture={(event) => {
        if (!open) { event.preventDefault(); event.stopPropagation(); return; }
        cancelAnimationFrame(touchReleaseFrame.current);
        const field = touchedField.current;
        touchedField.current = null;
        if (field && open) {
          motion.current?.settleEntrance();
          field.focus({ preventScroll: true });
        }
      }}
      onPointerUpCapture={() => {
        // Click normally follows in this task. If the gesture produces no
        // activation, release the held pose before the next paint instead.
        if (touchedField.current) touchReleaseFrame.current = requestAnimationFrame(() => {
          touchedField.current = null;
          motion.current?.settleEntrance();
        });
      }}
      onPointerCancel={() => {
        cancelAnimationFrame(touchReleaseFrame.current);
        touchedField.current = null;
        motion.current?.settleEntrance();
      }}
      onFocusCapture={(event) => settleBeforeInput(event.target)}
      onCancel={(event) => { event.preventDefault(); if (open) onClose(); }}
      onKeyDown={(event) => {
        if (!open) { event.preventDefault(); return; }
        if (event.key !== "Tab") return;
        motion.current?.settleEntrance();
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
        )).filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement?.id === labelledBy)) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onPointerDown={(event) => { backdropPressed.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (open && backdropPressed.current && event.target === event.currentTarget) onClose();
        backdropPressed.current = false;
      }}
    >
      {present ? children : null}
    </dialog>
  );
}
