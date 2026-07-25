import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { differenceInCalendarDays, parseISO, subDays } from "date-fns";
import { createSupabaseServiceClient } from "@athonesayate/shared/supabase";
import { findRecurringPayment, normalizedNextDueOn } from "@athonesayate/shared/recurring";
import type { RecurringRule, Transaction, TransactionType } from "@athonesayate/shared/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REMINDER_WINDOW_DAYS = 1; // notify for bills due today or tomorrow (and overdue ones)

// Today's calendar date in the user's timezone, as a Date at local midnight.
function referenceDate() {
  const timeZone = process.env.BILL_REMINDER_TIMEZONE || "Asia/Yangon";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  return parseISO(today);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  // Fail closed in production: this route reads every user's bills, so an
  // unset secret must not leave it open.
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
    }
  } else if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured." }, { status: 500 });
  }
  webPush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", vapidPublicKey, vapidPrivateKey);

  // Service-role client: this job has no user session, and row-level security
  // would otherwise return nothing. Never import this into client code.
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase service credentials are not configured. Set SUPABASE_SERVICE_ROLE_KEY." },
      { status: 500 }
    );
  }

  const today = referenceDate();
  const paymentLookback = subDays(today, 45).toISOString().slice(0, 10);

  const [rulesResult, transactionsResult, subscriptionsResult] = await Promise.all([
    supabase.from("recurring_rules").select("*").eq("active", true),
    supabase.from("transactions").select("*").gte("occurred_on", paymentLookback),
    supabase.from("push_subscriptions").select("user_id, endpoint, p256dh, auth")
  ]);

  const firstError = rulesResult.error ?? transactionsResult.error ?? subscriptionsResult.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const subscriptions = subscriptionsResult.data ?? [];
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, due: 0, reason: "no subscriptions" });
  }

  // Everything below is partitioned by owner: a bill belonging to one account
  // must never appear in another account's notification.
  function groupBy<Row extends { user_id: string }, Mapped>(rows: Row[], map: (row: Row) => Mapped) {
    const grouped = new Map<string, Mapped[]>();
    rows.forEach((row) => {
      const bucket = grouped.get(row.user_id);
      if (bucket) {
        bucket.push(map(row));
      } else {
        grouped.set(row.user_id, [map(row)]);
      }
    });
    return grouped;
  }

  const rulesByUser = groupBy(rulesResult.data ?? [], (row): RecurringRule => ({
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id ?? undefined,
    subcategoryId: row.subcategory_id ?? undefined,
    type: row.type as TransactionType,
    amount: Number(row.amount),
    merchant: row.merchant,
    frequency: row.frequency,
    nextDueOn: row.next_due_on,
    autoCreate: row.auto_create
  }));

  const transactionsByUser = groupBy(transactionsResult.data ?? [], (row): Transaction => ({
    id: row.id,
    accountId: row.account_id,
    categoryId: row.category_id ?? undefined,
    subcategoryId: row.subcategory_id ?? undefined,
    type: row.type as TransactionType,
    amount: Number(row.amount),
    occurredOn: row.occurred_on,
    merchant: row.merchant ?? undefined,
    notes: row.notes ?? undefined,
    isRecurring: row.is_recurring ?? undefined,
    recurringRuleId: row.recurring_rule_id ?? undefined,
    recurringDueOn: row.recurring_due_on ?? undefined
  }));

  const subscriptionsByUser = groupBy(subscriptions, (row) => row);

  const formatAmount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

  let sent = 0;
  let totalDue = 0;
  let usersNotified = 0;
  const stale: string[] = [];

  for (const [userId, userSubscriptions] of subscriptionsByUser) {
    const rules = rulesByUser.get(userId) ?? [];
    const transactions = transactionsByUser.get(userId) ?? [];
    const liveRuleIds = new Set(rules.map((rule) => rule.id));

    const dueBills = rules
      .filter((rule) => rule.type === "expense")
      .map((rule) => {
        const dueOn = normalizedNextDueOn(rule, today);
        return { rule, dueOn, daysUntilDue: differenceInCalendarDays(parseISO(dueOn), today) };
      })
      .filter(({ rule, daysUntilDue }) =>
        daysUntilDue <= REMINDER_WINDOW_DAYS && !findRecurringPayment(rule, transactions, today, liveRuleIds)
      )
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    if (dueBills.length === 0) {
      continue;
    }

    totalDue += dueBills.length;
    usersNotified += 1;

    const lines = dueBills.map(({ rule, daysUntilDue }) => {
      const when = daysUntilDue < 0 ? `overdue by ${Math.abs(daysUntilDue)}d` : daysUntilDue === 0 ? "due today" : "due tomorrow";
      return `${rule.merchant} (฿${formatAmount.format(rule.amount)}) ${when}`;
    });
    const payload = JSON.stringify({
      title: dueBills.length === 1 ? "Bill reminder" : `${dueBills.length} bills need attention`,
      body: lines.slice(0, 4).join("\n") + (lines.length > 4 ? `\n+${lines.length - 4} more` : ""),
      url: "/",
      tag: "bill-reminder"
    });

    await Promise.all(
      userSubscriptions.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
            payload
          );
          sent += 1;
        } catch (error) {
          const statusCode = (error as { statusCode?: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            stale.push(subscription.endpoint);
          }
        }
      })
    );
  }

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return NextResponse.json({ sent, due: totalDue, usersNotified, staleRemoved: stale.length });
}
