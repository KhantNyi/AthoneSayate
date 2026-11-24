"use client";

import { Award, BookOpen, CalendarCheck, CalendarDays, Check, ChevronRight, Coins, Crown, Flame, Lock, Plus, Receipt, Star, Trophy, X, Zap, type LucideIcon } from "lucide-react";
import { parseISO } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currency } from "@athonesayate/shared/metrics";
import { companionTranslations } from "@/lib/i18n";
import { ACTIVITY_WEEKS, buildCompanionState, type AchievementId, type CompanionMood, type CompanionState, type Quest } from "@/lib/quests";
import { useApp } from "./app-context";
import { Modal } from "./modal";
import { runViewTransition } from "./motion";

const POT = "#E8744F";
const POT_DARK = "#C9573A";
const POT_DEEP = "#7A2E1C";

/** One-shot movements layered over the idle loop. */
export type MascotReaction = "coin" | "hop" | "cheer" | "shift";

const SPARKLE = "M0 -6L1.6 -1.6L6 0L1.6 1.6L0 6L-1.6 1.6L-6 0L-1.6 -1.6Z";

/**
 * Su Bu, a clay savings pot. Drawn inline so it themes, scales and animates
 * without an image request.
 *
 * `reaction` plays once on mount and again whenever `reactionKey` changes.
 */
export function Mascot({
  mood,
  size = 88,
  className = "",
  reaction,
  reactionKey = 0
}: {
  mood: CompanionMood;
  size?: number;
  className?: string;
  reaction?: MascotReaction;
  reactionKey?: number;
}) {
  const lively = mood === "happy" || mood === "proud";
  const dropping = reaction === "coin";

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
      <g key={reactionKey} className={reaction ? `mascot-react mascot-react-${reaction}` : undefined}>
        <g className="mascot-body">
          <ellipse cx="45" cy="104" rx="9" ry="5" fill={POT_DARK} />
          <ellipse cx="75" cy="104" rx="9" ry="5" fill={POT_DARK} />
          {dropping ? (
            <g className="mascot-drop">
              <circle cx="60" cy="22" r="9" fill="#FFC400" stroke="#D69600" strokeWidth="2.5" />
            </g>
          ) : (
            <g className={lively ? "mascot-coin" : undefined}>
              <circle cx="60" cy={lively ? 15 : 22} r="9" fill="#FFC400" stroke="#D69600" strokeWidth="2.5" />
            </g>
          )}
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
              <g className="mascot-pupils">
                <circle cx={mood === "worried" ? 46 : 47} cy={mood === "worried" ? 68 : 66} r="4" fill={POT_DEEP} />
                <circle cx={mood === "worried" ? 74 : 75} cy={mood === "worried" ? 68 : 66} r="4" fill={POT_DEEP} />
              </g>
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

          {mood === "worried" ? (
            <path className="mascot-sweat" d="M98 38Q104 47 98 51Q92 47 98 38Z" fill="#7CC4F5" />
          ) : null}
        </g>

        {mood === "sleepy" ? (
          <g className="mascot-zzz" fill="rgb(var(--ink) / 0.5)" fontWeight="800" fontFamily="inherit">
            <text x="88" y="42" fontSize="12">z</text>
            <text x="97" y="29" fontSize="15">z</text>
            <text x="107" y="14" fontSize="19">z</text>
          </g>
        ) : mood === "proud" ? (
          <g className="mascot-sparkles" fill="#FFC400">
            <g transform="translate(17 32)"><path d={SPARKLE} /></g>
            <g transform="translate(104 44) scale(0.8)"><path d={SPARKLE} /></g>
            <g transform="translate(94 12) scale(1.15)"><path d={SPARKLE} /></g>
          </g>
        ) : null}
      </g>
    </svg>
  );
}

/** Lets a component trigger mascot reactions: spread the first value onto `<Mascot>` and call `play`. */
export function useMascotReaction() {
  const [state, setState] = useState<{ reaction?: MascotReaction; reactionKey: number }>({ reactionKey: 0 });
  const play = useCallback((reaction: MascotReaction) => {
    setState((current) => ({ reaction, reactionKey: current.reactionKey + 1 }));
  }, []);
  return [state, play] as const;
}

/** Su Bu standing in for a list with nothing in it yet. */
export function MascotEmpty({
  mood = "sleepy",
  title,
  hint,
  action
}: {
  mood?: CompanionMood;
  title: string;
  hint: string;
  action?: React.ReactNode;
}) {
  const [reaction, play] = useMascotReaction();

  return (
    <div className="mascot-empty grid justify-items-center gap-1.5 rounded-xl border border-dashed border-ink/15 px-4 py-8 text-center">
      <span onPointerDown={() => play("hop")} className="mb-1 block">
        <Mascot mood={mood} size={84} className="mascot-idle" {...reaction} />
      </span>
      <p className="text-base font-semibold text-ink">{title}</p>
      <p className="max-w-xs text-sm leading-snug text-ink/55">{hint}</p>
      {action ? <div className="mt-2.5">{action}</div> : null}
    </div>
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
  const [profileOpen, setProfileOpen] = useState(false);
  const [reaction, play] = useMascotReaction();
  // A change of mood gets a visible beat instead of the face just swapping.
  const lastMood = useRef(state.mood);
  useEffect(() => {
    if (lastMood.current === state.mood) return;
    lastMood.current = state.mood;
    play("shift");
  }, [state.mood, play]);
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
    <section className="liquid-panel companion-card companion-hero min-w-0 p-4 sm:p-5" aria-label={c.name} data-profile-open={profileOpen || undefined}>
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
        <div className="grid content-start gap-4">
          <button
            type="button"
            onPointerDown={() => play("hop")}
            onClick={() => runViewTransition(() => setProfileOpen(true), "subu-open")}
            aria-label={c.openProfile}
            aria-haspopup="dialog"
            className="companion-open group -m-2 flex items-center gap-3 rounded-2xl p-2 text-left"
          >
            <Mascot mood={state.mood} size={92} className="mascot-idle" {...reaction} />
            <span className="block min-w-0 flex-1">
              <span className="speech-bubble block text-sm font-medium leading-snug text-ink">{c.mood[state.mood]}</span>
              <span className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold ${state.streak > 0 ? "bg-amber/15 text-amber" : "bg-ink/5 text-ink/55"}`}>
                  <Flame size={16} strokeWidth={2.8} className={state.streak > 0 ? "streak-flame" : undefined} />
                  <span className="tnum">{state.streak}</span>
                  <span className="font-medium">{c.streakDays}</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-sun/25 px-2.5 py-1 text-sm font-semibold text-ink">
                  <Star size={15} strokeWidth={2.8} />
                  {c.level} <span className="tnum">{state.level}</span>
                </span>
              </span>
            </span>
            <ChevronRight size={18} strokeWidth={2.6} className="companion-open-chevron shrink-0 text-ink/35" aria-hidden />
          </button>

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
      <CompanionProfile
        open={profileOpen}
        // A swipe has already carried the sheet most of the way down; let it finish
        // falling rather than morphing back into the card.
        onClose={(reason) => (reason === "drag" ? setProfileOpen(false) : runViewTransition(() => setProfileOpen(false), "subu-close"))}
        state={state}
      />
    </section>
  );
}

const ACHIEVEMENT_ICON: Record<AchievementId, LucideIcon> = {
  firstLog: Coins,
  streak3: Flame,
  streak7: CalendarCheck,
  streak30: Trophy,
  entries50: BookOpen,
  entries250: Award,
  days100: CalendarDays,
  level5: Crown
};

/** Expanded view of the companion: lifetime stats, recent activity and achievements. */
function CompanionProfile({ open, onClose, state }: { open: boolean; onClose: (reason?: "drag") => void; state: CompanionState }) {
  const { language } = useApp();
  const c = companionTranslations[language];
  const locale = language === "my" ? "my" : "en";
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }), [locale]);
  const sinceFormat = useMemo(() => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }), [locale]);
  const unlocked = state.achievements.filter((item) => item.done).length;
  const [reaction, play] = useMascotReaction();
  // Earned first, then whichever locked one is closest.
  const achievements = [...state.achievements].sort(
    (a, b) => Number(b.done) - Number(a.done) || b.progress / b.target - a.progress / a.target
  );
  const stats: { icon: LucideIcon; label: string; value: number; unit?: string; tone: string }[] = [
    { icon: Flame, label: c.statStreak, value: state.streak, unit: c.days, tone: "text-amber" },
    { icon: Trophy, label: c.statBest, value: state.bestStreak, unit: c.days, tone: "text-sun" },
    { icon: CalendarCheck, label: c.statDays, value: state.daysLogged, tone: "text-moss" },
    { icon: Receipt, label: c.statEntries, value: state.totalEntries, tone: "text-river" }
  ];

  return (
    <Modal open={open} onClose={onClose} labelledBy="companion-profile-title">
      <div className="liquid-sheet liquid-scroll companion-card companion-profile w-full max-w-lg overflow-y-auto rounded-t-2xl border border-ink/10 p-5 shadow-lift sm:rounded-2xl">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => play(state.mood === "proud" ? "cheer" : "hop")} aria-label={c.poke} className="mascot-poke shrink-0 rounded-2xl">
            <Mascot mood={state.mood} size={84} className="mascot-idle" {...reaction} />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <h2 id="companion-profile-title" className="font-display text-xl font-semibold leading-tight outline-none">{c.name}</h2>
            <p className="mt-1 text-sm leading-snug text-ink/60">{c.mood[state.mood]}</p>
          </div>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label={c.close}
            className="-mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-lg text-ink/60 transition hover:bg-ink/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-ink/10 p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-base font-semibold">
              <Star size={16} strokeWidth={2.8} className="text-sun" />
              {c.level} <span className="tnum">{state.level}</span>
            </span>
            <span className="tnum font-mono text-xs text-ink/55">{state.xp.toLocaleString()} {c.totalXp}</span>
          </div>
          <div className="quest-bar mt-2.5 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-sun" style={{ width: `${Math.max(state.levelProgress, 0.04) * 100}%` }} />
          </div>
          <p className="tnum mt-2 font-mono text-xs text-ink/55">{state.xpToNext} XP {c.toNextLevel}</p>
        </div>

        <h3 className="mb-2 mt-5 text-sm font-semibold">{c.stats}</h3>
        <dl className="grid grid-cols-2 gap-2">
          {stats.map(({ icon: Icon, label, value, unit, tone }) => (
            <div key={label} className="rounded-xl border border-ink/10 p-3">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-ink/55">
                <Icon size={14} strokeWidth={2.6} className={tone} />
                {label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold leading-none">
                <span className="tnum">{value.toLocaleString()}</span>
                {unit ? <span className="ml-1 text-xs font-medium text-ink/50">{unit}</span> : null}
              </dd>
            </div>
          ))}
        </dl>
        {state.firstLoggedOn ? (
          <p className="mt-2 text-xs text-ink/50">{c.since} {sinceFormat.format(parseISO(state.firstLoggedOn))}</p>
        ) : null}

        <div className="mb-2 mt-5 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{c.activity}</h3>
          <span className="flex items-center gap-1 text-[11px] text-ink/50" aria-hidden>
            {c.less}
            {[0, 1, 2, 3].map((level) => <span key={level} className="activity-cell size-2.5" data-level={level} />)}
            {c.more}
          </span>
        </div>
        <ol
          className="activity-map grid grid-flow-col grid-rows-7 gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${ACTIVITY_WEEKS}, minmax(0, 1fr))` }}
        >
          {state.activity.map((day) => {
            const label = `${dayFormat.format(parseISO(day.date))}: ${day.entries > 0 ? `${day.entries} ${c.entries}` : c.noEntries}`;
            return (
              <li
                key={day.date}
                className="activity-cell aspect-square"
                data-level={day.level}
                data-today={day.isToday || undefined}
                data-future={day.isFuture || undefined}
                title={day.isFuture ? undefined : label}
                aria-label={day.isFuture ? undefined : label}
                aria-hidden={day.isFuture || undefined}
              />
            );
          })}
        </ol>

        <div className="mb-2 mt-5 flex items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">{c.achievements}</h3>
          <span className="tnum font-mono text-xs text-ink/55">{unlocked} / {state.achievements.length} {c.unlocked}</span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {achievements.map((item) => {
            const Icon = ACHIEVEMENT_ICON[item.id];
            const copy = c.achievement[item.id];
            return (
              <li key={item.id} className="achievement flex items-center gap-3 rounded-xl border border-ink/10 p-3" data-done={item.done || undefined}>
                <span className="achievement-medal grid size-10 shrink-0 place-items-center rounded-full">
                  {item.done ? <Icon size={18} strokeWidth={2.6} /> : <Lock size={15} strokeWidth={2.6} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold leading-snug ${item.done ? "text-ink" : "text-ink/70"}`}>{copy.title}</p>
                  <p className="text-xs leading-snug text-ink/55">{copy.detail}</p>
                  {item.done ? null : (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="quest-bar min-w-0 flex-1 overflow-hidden rounded-full bg-ink/10">
                        <div className="h-full rounded-full bg-river" style={{ width: `${(item.progress / item.target) * 100}%` }} />
                      </div>
                      <span className="tnum shrink-0 font-mono text-[11px] text-ink/50">{item.progress}/{item.target}</span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink/50">
          <Zap size={14} strokeWidth={2.6} className="mt-0.5 shrink-0 text-sun" />
          {c.howXp}
        </p>
      </div>
    </Modal>
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

function Confetti({ spread = 1 }: { spread?: number }) {
  return (
    <div className="celebration-burst">
      {CONFETTI.map((piece, index) => (
        <span
          key={index}
          className="confetti"
          style={{
            "--dx": `${piece.dx * spread}px`,
            "--dy": `${piece.dy * spread}px`,
            "--rot": `${piece.rotate}deg`,
            animationDelay: `${piece.delay}ms`,
            background: piece.color,
            borderRadius: piece.round ? "999px" : "2px"
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

type Milestone = { key: number } & ({ kind: "level"; level: number } | { kind: "achievement"; id: AchievementId });

const BANNER_MS = 2400;
const MILESTONE_MS = 3800;

/**
 * Reward moments. Every quick add gets a small banner; levelling up or
 * unlocking an achievement gets a bigger one in its place.
 */
export function Celebration() {
  const { celebration, language, isLoading } = useApp();
  const c = companionTranslations[language];
  const state = useCompanion();
  const [visibleFor, setVisibleFor] = useState(0);
  const [milestone, setMilestone] = useState<Milestone | null>(null);

  useEffect(() => {
    if (celebration === 0) return;
    setVisibleFor(celebration);
    const timeout = window.setTimeout(() => setVisibleFor(0), BANNER_MS);
    return () => window.clearTimeout(timeout);
  }, [celebration]);

  // Milestones are derived, so spot them by comparing against the last settled
  // state. Only a single new entry counts: loading data or switching accounts
  // moves these numbers too, and that is not an achievement.
  const { level, totalEntries, achievements } = state;
  const settled = useRef<{ level: number; entries: number; done: AchievementId[] } | null>(null);
  useEffect(() => {
    if (isLoading) {
      settled.current = null;
      return;
    }
    const done = achievements.filter((item) => item.done).map((item) => item.id);
    const previous = settled.current;
    settled.current = { level, entries: totalEntries, done };
    if (!previous || totalEntries - previous.entries !== 1) return;

    const fresh = done.filter((id) => !previous.done.includes(id));
    if (level > previous.level) setMilestone({ key: Date.now(), kind: "level", level });
    else if (fresh.length > 0) setMilestone({ key: Date.now(), kind: "achievement", id: fresh[fresh.length - 1] });
  }, [isLoading, level, totalEntries, achievements]);

  useEffect(() => {
    if (!milestone) return;
    const timeout = window.setTimeout(() => setMilestone(null), MILESTONE_MS);
    return () => window.clearTimeout(timeout);
  }, [milestone]);

  if (milestone) {
    const Icon = milestone.kind === "level" ? Star : ACHIEVEMENT_ICON[milestone.id];
    return (
      <div key={milestone.key} className="milestone pointer-events-none fixed inset-0 z-[80] grid place-items-center px-6" role="status">
        <div className="relative">
          <Confetti spread={1.8} />
          <div className="milestone-card grid justify-items-center px-8 pb-6 pt-5 text-center">
            <Mascot mood="proud" size={128} reaction="cheer" />
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-sun/25 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-ink">
              <Icon size={14} strokeWidth={2.8} />
              {milestone.kind === "level" ? c.levelUp : c.achievementUnlocked}
            </p>
            <p className="mt-2.5 font-display text-2xl font-semibold leading-tight text-ink">
              {milestone.kind === "level" ? <>{c.level} <span className="tnum">{milestone.level}</span></> : c.achievement[milestone.id].title}
            </p>
            <p className="mt-1 max-w-[16rem] text-sm leading-snug text-ink/60">
              {milestone.kind === "level" ? c.levelUpDetail : c.achievement[milestone.id].detail}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (visibleFor === 0) return null;

  return (
    <div key={visibleFor} className="celebration pointer-events-none fixed inset-x-0 z-[80] flex justify-center px-3" aria-hidden>
      <div className="relative">
        <Confetti />
        <div className="celebration-banner flex items-center gap-3 py-2 pl-2 pr-5">
          <Mascot mood="proud" size={52} reaction="coin" />
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
