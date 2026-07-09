"use client";

import { useEffect, useRef, type ReactNode } from "react";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

/* Scroll parallax: the outer div is measured (so the transform never feeds
   back into the measurement) and the inner div is translated. Transform-only,
   rAF-throttled, disabled under prefers-reduced-motion. */
export function Parallax({
  children,
  speed = 0.1,
  disableBelow = 0,
  className = ""
}: {
  children: ReactNode;
  /** px shifted per px of distance from the viewport center; negative inverts */
  speed?: number;
  /** skip the effect entirely under this viewport width (px) */
  disableBelow?: number;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    if (prefersReducedMotion() || window.innerWidth < disableBelow) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = outer.getBoundingClientRect();
      // No work while far off-screen
      if (rect.bottom < -200 || rect.top > window.innerHeight + 200) return;
      const offset =
        (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
      inner.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [speed, disableBelow]);

  return (
    <div ref={outerRef} className={className}>
      <div ref={innerRef} style={{ willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}

/* Apple-style statement text: words start faint and light up one by one as
   the paragraph travels up the viewport. */
export function ScrollWords({
  text,
  className = "",
  lang
}: {
  text: string;
  className?: string;
  lang?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const words = Array.from(node.querySelectorAll<HTMLElement>(".scroll-word"));
    if (prefersReducedMotion()) {
      words.forEach((word) => word.classList.add("is-on"));
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = node.getBoundingClientRect();
      const vh = window.innerHeight;
      // Lights up while the block moves from 85% to ~35% of the viewport
      const progress = clamp((vh * 0.85 - rect.top) / (vh * 0.5));
      const on = Math.round(progress * words.length);
      words.forEach((word, i) => word.classList.toggle("is-on", i < on));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [text]);

  return (
    <p ref={ref} className={className} lang={lang}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} className="scroll-word">
          {word}{" "}
        </span>
      ))}
    </p>
  );
}
