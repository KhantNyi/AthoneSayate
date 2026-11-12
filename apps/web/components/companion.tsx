"use client";

import { Check, Flame, Plus, Star, X } from "lucide-react";
import { parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { currency } from "@athonesayate/shared/metrics";
import { companionTranslations } from "@/lib/i18n";
import { buildCompanionState, type CompanionMood, type Quest } from "@/lib/quests";
import { useApp } from "./app-context";

const POT = "#E8744F";
const POT_DARK = "#C9573A";
const POT_DEEP = "#7A2E1C";

/**
 * Su Bu, a clay savings pot. Drawn inline so it themes, scales and animates
 * without an image request.
 */
export function Mascot({ mood, size = 88, className = "" }: { mood: CompanionMood; size?: number; className?: string }) {
  const lively = mood === "happy" || mood === "proud";

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      aria-hidden
      className={`mascot shrink-0 ${className}`}
      data-mood={mood}
    >
      <ellipse cx="60" cy="111" rx="30" ry="5" fill="rgb(var(--ink) / 0.12)" />
      <g className="mascot-body">
        <ellipse cx="45" cy="104" rx="9" ry="5" fill={POT_DARK} />
        <ellipse cx="75" cy="104" rx="9" ry="5" fill={POT_DARK} />
        <g className={lively ? "mascot-coin" : undefined}>
          <circle cx="60" cy={lively ? 15 : 22} r="9" fill="#FFC400" stroke="#D69600" strokeWidth="2.5" />
        </g>
        <rect x="40" y="20" width="40" height="15" rx="7.5" fill={POT_DARK} />
        <rect x="50" y="25" width="20" height="4" rx="2" fill={POT_DEEP} />
        <path d="M60 31C92 31 104 52 104 72C104 94 86 106 60 106C34 106 16 94 16 72C16 52 28 31 60 31Z" fill={POT} />
        <path d="M23 91Q60 104 97 91" fill="none" stroke={POT_DARK} strokeWidth="3" strokeLinecap="round" opacity="0.6" />
        <ellipse cx="40" cy="54" rx="8" ry="13" fill="#fff" opacity="0.2" transform="rotate(24 40 54)" />
        <circle cx="35" cy="79" r="5.5" fill="#FF9E80" opacity="0.75" />
        <circle cx="85" cy="79" r="5.5" fill="#FF9E80" opacity="0.75" />

        {mood === "sleepy" ? (
          <g fill="none" stroke={POT_DEEP} strokeWidth="3.5" strokeLinecap="round">
            <path d="M39 67Q46 72 53 67" />
            <path d="M67 67Q74 72 81 67" />
          </g>
        ) : mood === "proud" ? (
          <g fill="none" stroke={POT_DEEP} strokeWidth="3.5" strokeLinecap="round">
            <path d="M39 69Q46 60 53 69" />
            <path d="M67 69Q74 60 81 69" />
          </g>
        ) : (
          <g className="mascot-eyes">
            <circle cx="46" cy="66" r="8" fill="#fff" />
            <circle cx="74" cy="66" r="8" fill="#fff" />
            <circle cx={mood === "worried" ? 46 : 47} cy={mood === "worried" ? 68 : 66} r="4" fill={POT_DEEP} />
            <circle cx={mood === "worried" ? 74 : 75} cy={mood === "worried" ? 68 : 66} r="4" fill={POT_DEEP} />
            {mood === "worried" ? (
              <g fill="none" stroke={POT_DEEP} strokeWidth="3" strokeLinecap="round">
                <path d="M38 58L52 54" />
                <path d="M82 58L68 54" />
              </g>
            ) : null}
          </g>
        )}

        {mood === "sleepy" ? (
          <circle cx="60" cy="84" r="3" fill={POT_DEEP} />
        ) : mood === "proud" ? (
          <path d="M50 80Q60 93 70 80Z" fill={POT_DEEP} stroke={POT_DEEP} strokeWidth="3" strokeLinejoin="round" />
        ) : mood === "worried" ? (
          <path d="M53 87Q60 81 67 87" fill="none" stroke={POT_DEEP} strokeWidth="3.5" strokeLinecap="round" />
        ) : (
          <path d="M52 81Q60 89 68 81" fill="none" stroke={POT_DEEP} strokeWidth="3.5" strokeLinecap="round" />
        )}
      </g>
    </svg>
  );
}

function useCompanion() {
  const { transactions, recurringDue, upcoming, recurringPayments } = useApp();
  const overdueBills = upcoming.filter((rule) => rule.daysUntilDue < 0 && !recurringPayments[rule.id]).length;
  return useMemo(
    () => buildCompanionState({ transactions, recurringDue, overdueBills }),
    [transactions, recurringDue, overdueBills]
  );
}

function QuestRow({ quest, label, detail, hint }: { quest: Quest; label: string; detail?: string; hint?: boolean }) {
  const ratio = quest.target > 0 ? Math.min(quest.progress / quest.target, 1) : quest.progress > 0 ? 1 : 0;
  const fill = quest.failed ? "bg-coral" : quest.done ? "bg-moss" : "bg-river";

  return (
    <li className="quest-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3" data-done={quest.done || undefined}>
      <span
        className={`grid size-9 place-items-center rounded-full border-2 ${
          quest.done
            ? "quest-check border-moss bg-moss text-bright"
            : quest.failed
              ? "border-coral/40 bg-coral/10 text-coral"
              : "border-ink/15 text-ink/30"
        }`}
      >
        {quest.failed ? <X size={16} strokeWidth={3} /> : <Check size={16} strokeWidth={3.5} />}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-medium leading-snug ${quest.done ? "text-ink/55" : "text-ink"}`}>{label}</p>
        <div className="quest-bar mt-1.5 overflow-hidden rounded-full bg-ink/10">
          <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(ratio, quest.done ? 1 : 0) * 100}%` }} />
        </div>
        {detail ? <p className={`mt-1 text-xs text-ink/55 ${hint ? "" : "tnum font-mono"}`}>{detail}</p> : null}
      </div>
      <span className={`tnum shrink-0 rounded-full px-2 py-1 font-mono text-[11px] ${quest.done ? "bg-sun/25 text-ink" : "bg-ink/5 text-ink/55"}`}>
        +{quest.xp} XP
      </span>
    </li>
  );
}

/** Dashboard hero: how today is going, in one glance, with one thing to do next. */
export function CompanionCard() {
  const { language, setQuickAddOpen } = useApp();
  const c = companionTranslations[language];
  const state = useCompanion();
  const weekdayFormat = useMemo(() => new Intl.DateTimeFormat(language === "my" ? "my" : "en", { weekday: "narrow" }), [language]);

  const questLabel: Record<Quest["id"], string> = {
    logToday: c.questLog,
    underDaily: c.questUnder,
    weekRhythm: c.questWeek,
    billsClear: c.questBills
  };
  const questDetail = (quest: Quest) =>
    quest.id === "underDaily"
      ? state.allowanceKnown
        ? `${currency.format(quest.progress)} / ${currency.format(quest.target)}`
        : c.questUnderNoIncome
      : quest.id === "weekRhythm"
        ? `${quest.progress} / ${quest.target}`
        : undefined;

  return (
    <section className="liquid-panel companion-card min-w-0 p-4 sm:p-5" aria-label={c.name}>
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
        <div className="grid content-start gap-4">
          <div className="flex items-center gap-3">
            <Mascot mood={state.mood} size={92} className="mascot-idle" />
            <div className="min-w-0 flex-1">
              <p className="speech-bubble text-sm font-medium leading-snug text-ink">{c.mood[state.mood]}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${state.streak > 0 ? "bg-amber/15 text-amber" : "bg-ink/5 text-ink/55"}`}>
                  <Flame size={16} strokeWidth={2.8} className={state.streak > 0 ? "streak-flame" : undefined} />
                  <span className="tnum">{state.streak}</span>
                  <span className="font-medium">{c.streakDays}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sun/25 px-2.5 py-1 text-sm font-semibold text-ink">
                  <Star size={15} strokeWidth={2.8} />
                  {c.level} <span className="tnum">{state.level}</span>
                </span>
              </div>
            </div>
          </div>

          <ol className="grid grid-cols-7 gap-1.5" aria-label={c.thisWeek}>
            {state.week.map((day) => (
              <li key={day.date} className="grid justify-items-center gap-1">
                <span className={`text-[11px] font-semibold uppercase ${day.isToday ? "text-river" : "text-ink/45"}`}>
                  {weekdayFormat.format(parseISO(day.date))}
                </span>
                <span
                  className={`week-dot grid size-9 place-items-center rounded-full border-2 ${
                    day.logged
                      ? ""
                      : day.isToday
                        ? "border-dashed border-river text-river"
                        : "border-ink/10 text-transparent"
                  } ${day.isFuture ? "opacity-50" : ""}`}
                  data-logged={day.logged || undefined}
                >
                  {day.logged ? <Check size={16} strokeWidth={3.5} /> : day.isToday ? <Plus size={15} strokeWidth={3} /> : null}
                </span>
              </li>
            ))}
          </ol>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-ink/55">
              <span>{c.level} {state.level}</span>
              <span className="tnum font-mono">{state.xpToNext} XP {c.toNextLevel}</span>
            </div>
            <div className="quest-bar overflow-hidden rounded-full bg-ink/10">
              <div className="h-full rounded-full bg-sun" style={{ width: `${Math.max(state.levelProgress, 0.04) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="grid content-start gap-3">
          <h2 className="text-base font-semibold">{c.todayQuests}</h2>
          <ul className="grid gap-3.5">
            {state.quests.map((quest) => (
              <QuestRow key={quest.id} quest={quest} label={questLabel[quest.id]} detail={questDetail(quest)} hint={quest.id === "underDaily" && !state.allowanceKnown} />
            ))}
          </ul>
          {!state.loggedToday ? (
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="btn-primary mt-1 inline-flex h-12 w-full items-center justify-center gap-2 text-sm"
            >
              <Plus size={18} strokeWidth={3} />
              {c.cta}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const CONFETTI_COLORS = ["rgb(var(--river))", "rgb(var(--moss))", "rgb(var(--sun))", "rgb(var(--coral))", POT];
const CONFETTI = Array.from({ length: 30 }, (_, index) => {
  // Deterministic spread: even fan with alternating reach, no per-render randomness.
  const angle = (index / 30) * Math.PI * 2;
  const reach = 90 + ((index * 37) % 110);
  return {
    dx: Math.cos(angle) * reach,
    dy: Math.sin(angle) * reach * 0.7 - 40,
    rotate: (index * 67) % 360,
    delay: (index % 6) * 18,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    round: index % 3 === 0
  };
});

/** Brief reward moment after a successful quick add. Decorative only: the toast carries the message. */
export function Celebration() {
  const { celebration, language } = useApp();
  const c = companionTranslations[language];
  const state = useCompanion();
  const [visibleFor, setVisibleFor] = useState(0);

  useEffect(() => {
    if (celebration === 0) return;
    setVisibleFor(celebration);
    const timeout = window.setTimeout(() => setVisibleFor(0), 2400);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  if (visibleFor === 0) return null;

  return (
    <div key={visibleFor} className="celebration pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-3" aria-hidden>
      <div className="relative">
        <div className="celebration-burst">
          {CONFETTI.map((piece, index) => (
            <span
              key={index}
              className="confetti"
              style={{
                "--dx": `${piece.dx}px`,
                "--dy": `${piece.dy}px`,
                "--rot": `${piece.rotate}deg`,
                animationDelay: `${piece.delay}ms`,
                background: piece.color,
                borderRadius: piece.round ? "999px" : "2px"
              } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="celebration-banner flex items-center gap-3 py-2 pl-2 pr-5">
          <Mascot mood="proud" size={52} />
          <div>
            <p className="text-base font-semibold leading-tight text-ink">{c.celebrate}</p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-sm font-semibold text-amber">
              <Flame size={15} strokeWidth={2.8} />
              <span className="tnum">{state.streak}</span> {c.streakDays}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
