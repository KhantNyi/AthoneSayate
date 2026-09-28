"use client";

import { useEffect, useRef, type ReactNode } from "react";

let openModals = 0;
let previousOverflow = "";

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

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement;
    dialog.showModal();
    if (openModals++ === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const viewport = window.visualViewport;
    const resize = () => {
      dialog.style.setProperty("--modal-height", `${viewport?.height ?? window.innerHeight}px`);
      dialog.style.setProperty("--modal-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      dialog.close();
      if (--openModals === 0) document.body.style.overflow = previousOverflow;
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
