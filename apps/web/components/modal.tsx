"use client";

import { useCallback, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPopupMotion, useAnimatedPresence } from "./glass-motion";

let openModals = 0;
let restoreBody: (() => void) | undefined;

/** Native top-layer dialogs stay above transformed cards and make the page inert. */
export function Modal({ open, onClose, labelledBy, children, centered = false }: {
  open: boolean;
  onClose: () => void;
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
      Object.assign(body.style, { overflow: "hidden", position: "fixed", top: `${-scrollY}px`, left: `${-scrollX}px`, width: "100%" });
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
    motion.current.play({
      open,
      from: entered.current ? undefined : from,
      to: open ? { transform: "none", opacity: "1" } : from,
      duration: open ? (bottomSheet() ? 320 : 240) : (bottomSheet() ? 220 : 180),
      easing: open ? style.getPropertyValue("--ease-ios").trim() || "cubic-bezier(0.32, 0.72, 0, 1)" : "cubic-bezier(0.4, 0, 1, 1)",
      onFinish: open ? undefined : finishExit
    });
    entered.current = true;
  }, [open, present, bottomSheet, exitPose, finishExit]);

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
