"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { haptic, leaveThen } from "./motion";

/** Width of each revealed action. */
const ACTION_PX = 76;
const OPEN_PX = ACTION_PX * 2;
/** Past this share of the row's width, letting go deletes outright. */
const FULL_SWIPE = 0.55;

/** Only one row stays open at a time, as in native lists. */
type RowHandle = { close: () => void };
let openRow: RowHandle | null = null;

/**
 * A list row whose face slides left to reveal Edit and Delete, and deletes
 * outright on a long swipe. Touch only: the row keeps its visible buttons for
 * mouse, keyboard and screen readers, so the gesture is a shortcut, never the
 * only way to act.
 */
export function SwipeRow({
  children,
  className = "",
  faceClassName = "",
  fresh = false,
  disabled = false,
  onEdit,
  onDelete
}: {
  children: ReactNode;
  className?: string;
  faceClassName?: string;
  fresh?: boolean;
  disabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const row = useRef<HTMLElement>(null);
  const face = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const offset = useRef(0);
  const gesture = useRef<{ id: number; x: number; y: number; from: number; tracking: boolean; samples: { x: number; t: number }[] } | null>(null);
  const armed = useRef(false);
  const suppressClick = useRef(false);
  // Stable identity for the open-row registry; its close is refreshed each render.
  const handle = useRef<RowHandle>({ close: () => {} });

  /** Moves the face (and the revealed strip) to `x`, animated unless dragging. */
  const place = (x: number, animate: boolean) => {
    const surface = face.current;
    const strip = actions.current;
    if (!surface || !strip) return;
    offset.current = x;
    const easing = "280ms cubic-bezier(0.32, 0.72, 0, 1)";
    surface.style.transition = animate ? `transform ${easing}` : "none";
    // Visibility flips only after the strip has closed, so it never blinks out mid-slide.
    strip.style.transition = animate ? `width ${easing}, visibility 0s linear 280ms` : "none";
    surface.style.transform = x === 0 ? "" : `translateX(${x}px)`;
    strip.style.width = `${Math.max(-x, 0)}px`;
  };

  const close = () => {
    place(0, true);
    setOpen(false);
    if (row.current) row.current.dataset.swipe = "closed";
    if (openRow === handle.current) openRow = null;
  };
  handle.current.close = close;

  const remove = () => {
    haptic("warning");
    const width = row.current?.offsetWidth ?? 320;
    place(-width, true);
    setOpen(false);
    if (row.current) row.current.dataset.swipe = "removing";
    if (openRow === handle.current) openRow = null;
    // If the delete is refused and the row comes back, bring its face back too.
    window.setTimeout(() => leaveThen(row.current, onDelete, () => place(0, false)), 200);
  };

  // An open row closes when anything else is touched.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !row.current?.contains(event.target)) close();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  });

  useEffect(() => {
    if (disabled && offset.current !== 0) close();
  });

  const setArmed = (next: boolean) => {
    if (armed.current === next) return;
    armed.current = next;
    if (row.current) row.current.dataset.armed = next ? "true" : "";
    if (next) haptic("tap");
  };

  return (
    <article
      ref={row}
      data-row
      data-fresh={fresh || undefined}
      data-swipe={open ? "open" : "closed"}
      className={`swipe-row relative overflow-hidden ${className}`}
    >
      <div ref={actions} className="swipe-actions" aria-hidden={!open}>
        <button type="button" tabIndex={open ? 0 : -1} onClick={() => { close(); onEdit(); }} className="swipe-edit">
          <Pencil size={18} />
          <span>Edit</span>
        </button>
        <button type="button" tabIndex={open ? 0 : -1} onClick={remove} className="swipe-delete">
          <Trash2 size={18} />
          <span>Delete</span>
        </button>
      </div>
      <div
        ref={face}
        className={`swipe-face relative ${faceClassName}`}
        onPointerDown={(event) => {
          suppressClick.current = false;
          if (disabled || event.pointerType === "mouse" || !event.isPrimary) return;
          if (event.target instanceof Element && event.target.closest("input, textarea, select")) return;
          if (openRow && openRow !== handle.current) openRow.close();
          gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, from: offset.current, tracking: false, samples: [{ x: event.clientX, t: event.timeStamp }] };
        }}
        onPointerMove={(event) => {
          const g = gesture.current;
          if (!g || g.id !== event.pointerId) return;
          const dx = event.clientX - g.x;
          const dy = event.clientY - g.y;
          if (!g.tracking) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            // Vertical: let the page scroll (the browser cancels this pointer).
            if (Math.abs(dy) > Math.abs(dx)) {
              gesture.current = null;
              return;
            }
            g.tracking = true;
            event.currentTarget.setPointerCapture(event.pointerId);
            if (row.current) row.current.dataset.swipe = "dragging";
          }
          const width = row.current?.offsetWidth ?? 320;
          let x = g.from + dx;
          // Rightward past rest resists; there is nothing to reveal on that side.
          if (x > 0) x = (24 * x) / (24 + x);
          place(x, false);
          setArmed(-x > width * FULL_SWIPE);
          g.samples.push({ x: event.clientX, t: event.timeStamp });
          while (g.samples.length > 2 && event.timeStamp - g.samples[0].t > 100) g.samples.shift();
        }}
        onPointerUp={(event) => {
          const g = gesture.current;
          gesture.current = null;
          if (!g || g.id !== event.pointerId || !g.tracking) return;
          suppressClick.current = true;
          const first = g.samples[0];
          const last = g.samples[g.samples.length - 1];
          const velocity = last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
          const x = offset.current;
          if (armed.current) {
            setArmed(false);
            remove();
            return;
          }
          if (-x > ACTION_PX || velocity < -0.35) {
            place(-OPEN_PX, true);
            setOpen(true);
            if (row.current) row.current.dataset.swipe = "open";
            openRow = handle.current;
          } else {
            close();
            if (row.current) row.current.dataset.swipe = "closed";
          }
        }}
        onPointerCancel={() => {
          const g = gesture.current;
          gesture.current = null;
          if (g?.tracking) {
            setArmed(false);
            close();
          }
        }}
        onClickCapture={(event) => {
          // The end of a swipe, or a tap on an open row, only settles the row.
          if (suppressClick.current || open) {
            suppressClick.current = false;
            event.preventDefault();
            event.stopPropagation();
            if (open) close();
          }
        }}
      >
        {children}
      </div>
    </article>
  );
}
