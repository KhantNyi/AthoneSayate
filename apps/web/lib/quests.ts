import { addDays, differenceInCalendarDays, endOfMonth, format, parseISO, startOfWeek, subDays } from "date-fns";
import type { Transaction } from "@athonesayate/shared/types";

/**
 * Companion state: streak, quests, XP and mood. Everything here is derived
 * from transactions the user can already see, so it needs no extra tables,
 * works in the signed-out demo, and stays correct offline.
 */

export type CompanionMood = "sleepy" | "happy" | "proud" | "worried";
export type QuestId = "logToday" | "underDaily" | "weekRhythm" | "billsClear";

export type Quest = {
  id: QuestId;
  progress: number;
  target: number;
  done: boolean;
  /** Can no longer be completed today (e.g. already over the daily amount). */
  failed: boolean;
  xp: number;
};

export type WeekDay = { date: string; logged: boolean; isToday: boolean; isFuture: boolean };

export type AchievementId = "firstLog" | "streak3" | "streak7" | "streak30" | "days100" | "entries50" | "entries250" | "level5";

export type Achievement = { id: AchievementId; progress: number; target: number; done: boolean };

/** One cell of the activity map. `level` buckets the entry count: 0 none, 1 light, 2 steady, 3 busy. */
export type ActivityDay = { date: string; entries: number; level: 0 | 1 | 2 | 3; isToday: boolean; isFuture: boolean };

export type CompanionState = {
  streak: number;
  /** Longest run of consecutive logged days, ever. */
  bestStreak: number;
  daysLogged: number;
  totalEntries: number;
  /** Earliest logged day (yyyy-MM-dd), if any. */
  firstLoggedOn: string | null;
  /** Whole weeks, Monday first, oldest first, ending with the current week. */
  activity: ActivityDay[];
  achievements: Achievement[];
  loggedToday: boolean;
  todaySpent: number;
  /** False when no income is recorded this month, so there is nothing to measure today against. */
  allowanceKnown: boolean;
  week: WeekDay[];
  quests: Quest[];
  xp: number;
  level: number;
  /** 0..1 progress through the current level. */
  levelProgress: number;
  xpToNext: number;
  mood: CompanionMood;
};

export const XP_PER_LEVEL = 200;
const XP_PER_LOGGED_DAY = 10;
const XP_PER_ENTRY = 2;
const MAX_ENTRIES_COUNTED_PER_DAY = 5;
export const WEEK_RHYTHM_TARGET = 5;
export const ACTIVITY_WEEKS = 15;

const dayKey = (date: Date) => format(date, "yyyy-MM-dd");

export function buildCompanionState({
  transactions,
  recurringDue,
  overdueBills,
  today = new Date()
}: {
  transactions: Transaction[];
  /** Recurring expenses still due this month. */
  recurringDue: number;
  overdueBills: number;
  today?: Date;
}): CompanionState {
  const todayKey = dayKey(today);
  const entriesByDay = new Map<string, number>();
  const monthKey = todayKey.slice(0, 7);
  let todaySpent = 0;
  let monthIncome = 0;
  let spentBeforeToday = 0;

  for (const transaction of transactions) {
    // Future-dated entries shouldn't extend a streak or earn XP yet.
    if (transaction.occurredOn > todayKey) continue;
    entriesByDay.set(transaction.occurredOn, (entriesByDay.get(transaction.occurredOn) ?? 0) + 1);
    if (!transaction.occurredOn.startsWith(monthKey)) continue;
    if (transaction.type === "income") monthIncome += transaction.amount;
    else if (transaction.type === "expense") {
      if (transaction.occurredOn === todayKey) todaySpent += transaction.amount;
      else spentBeforeToday += transaction.amount;
    }
  }

  const loggedToday = entriesByDay.has(todayKey);

  // Today not being logged yet doesn't break the streak; it just isn't counted.
  let streak = 0;
  let cursor = loggedToday ? today : subDays(today, 1);
  while (entriesByDay.has(dayKey(cursor))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }

  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const week: WeekDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = dayKey(addDays(weekStart, index));
    return { date, logged: entriesByDay.has(date), isToday: date === todayKey, isFuture: date > todayKey };
  });
  const weekLogged = week.filter((day) => day.logged).length;

  let xp = 0;
  for (const entries of entriesByDay.values()) {
    xp += XP_PER_LOGGED_DAY + Math.min(entries, MAX_ENTRIES_COUNTED_PER_DAY) * XP_PER_ENTRY;
  }

  // Today's amount as it stood this morning: today's own spending must not
  // shrink the target it is measured against.
  const remainingDays = differenceInCalendarDays(endOfMonth(today), today) + 1;
  const allowanceKnown = monthIncome > 0;
  const allowance = allowanceKnown ? Math.max((monthIncome - spentBeforeToday - recurringDue) / remainingDays, 0) : 0;
  const overDaily = allowanceKnown && todaySpent > allowance;

  const quests: Quest[] = [
    { id: "logToday", progress: loggedToday ? 1 : 0, target: 1, done: loggedToday, failed: false, xp: 10 },
    // Only "done" once something is logged: an empty day isn't a disciplined one yet.
    { id: "underDaily", progress: allowanceKnown ? todaySpent : 0, target: allowance, done: allowanceKnown && loggedToday && !overDaily, failed: overDaily, xp: 15 },
    { id: "weekRhythm", progress: Math.min(weekLogged, WEEK_RHYTHM_TARGET), target: WEEK_RHYTHM_TARGET, done: weekLogged >= WEEK_RHYTHM_TARGET, failed: false, xp: 30 },
    { id: "billsClear", progress: overdueBills === 0 ? 1 : 0, target: 1, done: overdueBills === 0, failed: false, xp: 20 }
  ];

  const mood: CompanionMood = overDaily
    ? "worried"
    : !loggedToday
      ? "sleepy"
      : streak >= 7
        ? "proud"
        : "happy";

  const intoLevel = xp % XP_PER_LEVEL;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;

  const loggedDays = [...entriesByDay.keys()].sort();
  let bestStreak = 0;
  let run = 0;
  let previous = "";
  let totalEntries = 0;
  for (const day of loggedDays) {
    run = previous && dayKey(addDays(parseISO(previous), 1)) === day ? run + 1 : 1;
    if (run > bestStreak) bestStreak = run;
    previous = day;
    totalEntries += entriesByDay.get(day) ?? 0;
  }
  const daysLogged = loggedDays.length;

  const activityStart = subDays(weekStart, (ACTIVITY_WEEKS - 1) * 7);
  const activity: ActivityDay[] = Array.from({ length: ACTIVITY_WEEKS * 7 }, (_, index) => {
    const date = dayKey(addDays(activityStart, index));
    const entries = entriesByDay.get(date) ?? 0;
    return { date, entries, level: entries === 0 ? 0 : entries === 1 ? 1 : entries <= 3 ? 2 : 3, isToday: date === todayKey, isFuture: date > todayKey };
  });

  const achievement = (id: AchievementId, value: number, target: number): Achievement => ({
    id,
    progress: Math.min(value, target),
    target,
    done: value >= target
  });
  const achievements: Achievement[] = [
    achievement("firstLog", daysLogged, 1),
    achievement("streak3", bestStreak, 3),
    achievement("streak7", bestStreak, 7),
    achievement("streak30", bestStreak, 30),
    achievement("entries50", totalEntries, 50),
    achievement("entries250", totalEntries, 250),
    achievement("days100", daysLogged, 100),
    achievement("level5", level, 5)
  ];

  return {
    streak,
    bestStreak,
    daysLogged,
    totalEntries,
    firstLoggedOn: loggedDays[0] ?? null,
    activity,
    achievements,
    loggedToday,
    todaySpent,
    allowanceKnown,
    week,
    quests,
    xp,
    level,
    levelProgress: intoLevel / XP_PER_LEVEL,
    xpToNext: XP_PER_LEVEL - intoLevel,
    mood
  };
}
