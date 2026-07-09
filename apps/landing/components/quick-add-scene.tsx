"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { DashboardScreen, PhoneFrame, QuickAddSheet, SavedToast } from "./phone";

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* Pinned scroll scene: the section is 220vh tall, the viewport-height inner
   block sticks, and scroll progress drives the demo — sheet slides up over
   the dashboard, then a "Saved" toast pops. Styles are written straight to
   the DOM (transform/opacity only), no re-renders per frame. */
export function QuickAddScene() {
  const sectionRef = useRef<HTMLElement>(null);
  const phoneRef = useRef<HTMLDivElement>(null);
  const dimRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const phone = phoneRef.current;
    const dim = dimRef.current;
    const sheet = sheetRef.current;
    const toast = toastRef.current;
    if (!section || !phone || !dim || !sheet || !toast) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Static end state: sheet up, toast visible.
      sheet.style.transform = "translateY(0)";
      dim.style.opacity = "0.3";
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0) scale(1)";
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return;
      const p = clamp(-rect.top / total);

      const settleP = easeOut(clamp(p / 0.25));
      phone.style.transform = `scale(${0.94 + 0.06 * settleP})`;

      const sheetP = easeOut(clamp((p - 0.22) / 0.36));
      sheet.style.transform = `translateY(${((1 - sheetP) * 105).toFixed(2)}%)`;
      dim.style.opacity = (0.3 * sheetP).toFixed(3);

      const toastP = easeOut(clamp((p - 0.7) / 0.16));
      toast.style.opacity = toastP.toFixed(3);
      toast.style.transform = `translateY(${((1 - toastP) * 14).toFixed(1)}px) scale(${
        0.94 + 0.06 * toastP
      })`;
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
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 md:grid-cols-2">
          <div className="text-center md:text-left">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-river/20 bg-river/10 px-3.5 py-1.5 text-xs font-semibold text-river">
              <Sparkles size={13} />
              Quick add
            </div>
            <h2 className="text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Three taps.
              <br />
              <span className="hero-gradient-text">Logged.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-ink/60 md:mx-0 sm:text-lg">
              Keep scrolling — that&apos;s the whole flow. Amount, category, save.
              The sheet is already gone before your coffee arrives.
            </p>
            <ul className="mt-6 hidden space-y-2 text-sm text-ink/60 sm:block">
              <li className="flex items-center justify-center gap-2 md:justify-start">
                <span className="tnum grid h-6 w-6 place-items-center rounded-full bg-ink/10 text-xs font-bold text-ink/70">1</span>
                Type the amount
              </li>
              <li className="flex items-center justify-center gap-2 md:justify-start">
                <span className="tnum grid h-6 w-6 place-items-center rounded-full bg-ink/10 text-xs font-bold text-ink/70">2</span>
                Pick a category
              </li>
              <li className="flex items-center justify-center gap-2 md:justify-start">
                <span className="tnum grid h-6 w-6 place-items-center rounded-full bg-ink/10 text-xs font-bold text-ink/70">3</span>
                Save — synced and charted
              </li>
            </ul>
          </div>

          <div ref={phoneRef} className="scale-[0.94]" style={{ willChange: "transform" }}>
            <PhoneFrame activeTab={0} className="w-[260px] sm:w-[300px]">
              <DashboardScreen />
              {/* dim + sheet + toast, all inside the phone screen */}
              <div
                ref={dimRef}
                className="pointer-events-none absolute inset-0 z-20 bg-ink"
                style={{ opacity: 0 }}
              />
              <div
                ref={sheetRef}
                className="absolute inset-x-0 bottom-0 z-30"
                style={{ transform: "translateY(105%)", willChange: "transform" }}
              >
                <QuickAddSheet />
              </div>
              <div className="absolute inset-x-0 top-12 z-40 flex justify-center">
                <div ref={toastRef} style={{ opacity: 0, willChange: "transform, opacity" }}>
                  <SavedToast />
                </div>
              </div>
            </PhoneFrame>
          </div>
        </div>
      </div>
    </section>
  );
}
