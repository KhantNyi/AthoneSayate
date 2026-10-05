"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/** The animation owns exit completion; a stale completion cannot remove a
 * reopened popup. Retaining children preserves an interrupted form draft. */
export function useAnimatedPresence(open: boolean) {
  const [retained, setRetained] = useState(open);
  const isOpen = useRef(open);
  useLayoutEffect(() => {
    isOpen.current = open;
    if (open) setRetained(true);
  }, [open]);
  const finishExit = useCallback(() => {
    if (!isOpen.current) setRetained(false);
  }, []);
  return { present: open || retained, finishExit };
}

type PopupPose = { transform: string; opacity: string };
type PopupTransition = {
  open: boolean;
  from?: PopupPose;
  to: PopupPose;
  duration: number;
  easing: string;
  onFinish?: () => void;
};

/** Sample once on interruption, then animate transform and opacity in the
 * browser without React renders or frame callbacks. */
export function createPopupMotion(surface: HTMLElement, dialog?: HTMLDialogElement) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const previous = {
    transform: surface.style.transform,
    opacity: surface.style.opacity,
    willChange: surface.style.willChange,
    backdrop: dialog?.style.getPropertyValue("--modal-backdrop-opacity") ?? ""
  };
  let animations: Animation[] = [];
  let transition: PopupTransition | undefined;
  let generation = 0;
  let disposed = false;

  const cancel = () => {
    ++generation;
    for (const animation of animations) animation.cancel();
    animations = [];
    surface.style.willChange = previous.willChange;
  };
  const settle = () => {
    const callback = transition?.onFinish;
    if (transition) {
      surface.style.transform = transition.to.transform;
      surface.style.opacity = transition.to.opacity;
      dialog?.style.setProperty("--modal-backdrop-opacity", transition.open ? "1" : "0");
    }
    transition = undefined;
    // Inline styles already contain the destination; cancel releases layers.
    cancel();
    callback?.();
  };
  const play = (next: PopupTransition) => {
    if (disposed) return;
    const style = getComputedStyle(surface);
    const from = next.from ?? { transform: style.transform, opacity: style.opacity };
    const backdropFrom = next.from ? "0" : dialog ? getComputedStyle(dialog, "::backdrop").opacity : "0";
    cancel();
    transition = next;
    surface.style.transform = next.to.transform;
    surface.style.opacity = next.to.opacity;
    dialog?.style.setProperty("--modal-backdrop-opacity", next.open ? "1" : "0");
    if (reduced.matches || next.duration <= 0) {
      settle();
      return;
    }
    surface.style.willChange = "transform, opacity";
    const options = { duration: next.duration, easing: next.easing, fill: "both" as const };
    animations = [surface.animate([from, next.to], options)];
    if (dialog) {
      animations.push(dialog.animate([{ opacity: backdropFrom }, { opacity: next.open ? "1" : "0" }], {
        ...options, pseudoElement: "::backdrop"
      }));
    }
    const current = generation;
    Promise.all(animations.map(animation => animation.finished)).then(() => {
      if (!disposed && current === generation) settle();
    }).catch(() => {
      // Reopening, keyboard changes, and unmount deliberately cancel playback.
    });
  };
  const change = () => { if (reduced.matches) settle(); };
  reduced.addEventListener("change", change);

  return {
    play,
    settleEntrance: () => { if (transition?.open) settle(); },
    holdEntrance: () => {
      if (!transition?.open || !animations.length) return false;
      const style = getComputedStyle(surface);
      const transform = style.transform;
      const opacity = style.opacity;
      const backdrop = dialog ? getComputedStyle(dialog, "::backdrop").opacity : "0";
      cancel();
      surface.style.transform = transform;
      surface.style.opacity = opacity;
      dialog?.style.setProperty("--modal-backdrop-opacity", backdrop);
      return true;
    },
    retargetExit: (to: PopupPose) => {
      if (!transition || transition.open || transition.to.transform === to.transform) return;
      const elapsed = Number(animations[0]?.currentTime ?? 0);
      play({ ...transition, from: undefined, to, duration: Math.max(0, transition.duration - elapsed) });
    },
    destroy: () => {
      disposed = true;
      transition = undefined;
      reduced.removeEventListener("change", change);
      cancel();
      surface.style.transform = previous.transform;
      surface.style.opacity = previous.opacity;
      if (dialog) {
        if (previous.backdrop) dialog.style.setProperty("--modal-backdrop-opacity", previous.backdrop);
        else dialog.style.removeProperty("--modal-backdrop-opacity");
      }
    }
  };
}

/** A small composited light, clipped by its surface. Pointer movement never
 * updates React state and never animates a gradient or backdrop blur. */
export function GlassLight() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const light = ref.current;
    const surface = light?.parentElement?.parentElement;
    if (!light || !surface) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let frame = 0;
    let timer = 0;
    let clientX = 0;
    let clientY = 0;
    const hide = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      frame = 0;
      light.dataset.lit = "false";
    };
    const position = (event: PointerEvent) => {
      if (reduced.matches) return;
      clientX = event.clientX;
      clientY = event.clientY;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0;
        const bounds = surface.getBoundingClientRect();
        const x = Math.max(0, Math.min(bounds.width, clientX - bounds.left));
        const y = Math.max(0, Math.min(bounds.height, clientY - bounds.top));
        light.style.transform = `translate3d(${x - 80}px, ${y - 80}px, 0)`;
        light.dataset.lit = "true";
      });
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "touch" && fine.matches) position(event);
    };
    const press = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(":disabled, [aria-disabled='true']")) return;
      position(event);
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, 220);
    };
    const leave = (event: PointerEvent) => { if (event.pointerType !== "touch") hide(); };
    surface.addEventListener("pointermove", move, { passive: true });
    surface.addEventListener("pointerdown", press, { passive: true });
    surface.addEventListener("pointerleave", leave);
    surface.addEventListener("pointercancel", hide);
    surface.addEventListener("scroll", hide, { passive: true });
    reduced.addEventListener("change", hide);
    return () => {
      hide();
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerdown", press);
      surface.removeEventListener("pointerleave", leave);
      surface.removeEventListener("pointercancel", hide);
      surface.removeEventListener("scroll", hide);
      reduced.removeEventListener("change", hide);
    };
  }, []);
  return <span className="glass-light-clip" aria-hidden="true"><span ref={ref} className="glass-light" /></span>;
}

/** The indicator is a persistent sibling of the buttons. An interrupted move
 * starts at the currently displayed transform, rather than an old destination. */
export function GlassNav({ activeKey, className = "", children }: {
  activeKey: string;
  className?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const reposition = useRef<(animate: boolean) => void>(() => {});

  useLayoutEffect(() => {
    const container = track.current;
    const lens = indicator.current;
    if (!container || !lens) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    type Geometry = { x: number; y: number; width: number; height: number };
    const geometry = new Map<string, Geometry>();
    const easing = getComputedStyle(container).getPropertyValue("--ease-spring").trim();
    let animation: Animation | undefined;
    let destination: Geometry | undefined;
    let origin: Geometry | undefined;
    let disposed = false;
    const transform = (point: Geometry) => `translate3d(${point.x}px, ${point.y}px, 0)`;
    const update = (animate: boolean) => {
      const target = geometry.get(container.dataset.selected ?? "");
      if (!target || !target.width || !target.height) {
        animation?.cancel();
        lens.dataset.ready = "false";
        destination = undefined;
        return;
      }
      let from = destination ?? target;
      if (animation?.playState === "running" && origin && destination) {
        // Computed timing already includes the spring easing. Sample the
        // animation's position without forcing a style/layout flush.
        const progress = animation.effect?.getComputedTiming().progress ?? 1;
        from = { ...destination, x: origin.x + (destination.x - origin.x) * progress, y: origin.y + (destination.y - origin.y) * progress };
      }
      const changed = destination && (target.x !== destination.x || target.y !== destination.y);
      animation?.cancel();
      lens.style.width = `${target.width}px`;
      lens.style.height = `${target.height}px`;
      lens.style.transform = transform(target);
      lens.dataset.ready = "true";
      if (animate && changed && !reduced.matches) {
        animation = lens.animate([{ transform: transform(from) }, { transform: transform(target) }], { duration: 280, easing });
      }
      origin = from;
      destination = target;
    };
    // Geometry only changes with layout/font changes, not with selection.
    const measure = () => {
      container.querySelectorAll<HTMLElement>("[data-glass-key]").forEach(button => {
        geometry.set(button.dataset.glassKey!, { x: button.offsetLeft, y: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight });
      });
      update(false);
    };
    reposition.current = update;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    container.querySelectorAll("[data-glass-key]").forEach(button => observer.observe(button));
    const preferenceChanged = () => { if (reduced.matches) update(false); };
    reduced.addEventListener("change", preferenceChanged);
    void document.fonts.ready.then(() => { if (!disposed) measure(); });
    return () => {
      disposed = true;
      animation?.cancel();
      observer.disconnect();
      reduced.removeEventListener("change", preferenceChanged);
      reposition.current = () => {};
    };
  }, []);

  useLayoutEffect(() => { reposition.current(true); }, [activeKey]);

  return (
    <div ref={track} data-selected={activeKey} className={`glass-nav-track glass-reactive ${className}`}>
      <span ref={indicator} className="glass-nav-indicator" aria-hidden="true" />
      <GlassLight />
      {children}
    </div>
  );
}
