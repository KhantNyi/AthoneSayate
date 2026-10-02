"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

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

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement;
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
    const resize = () => {
      dialog.style.setProperty("--modal-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--modal-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    // Set the visible bounds and lock scrolling before native dialog focus runs.
    dialog.showModal();
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
      dialog.close();
      if (--openModals === 0) {
        restoreBody?.();
        restoreBody = undefined;
      }
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      className={`glass-dialog ${centered ? "glass-dialog-centered" : ""}`}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
        )).filter(node => node.tabIndex >= 0 && node.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onPointerDown={(event) => { backdropPressed.current = event.target === event.currentTarget; }}
      onClick={(event) => {
        if (backdropPressed.current && event.target === event.currentTarget) onClose();
        backdropPressed.current = false;
      }}
    >
      {open ? children : null}
    </dialog>
  );
}
