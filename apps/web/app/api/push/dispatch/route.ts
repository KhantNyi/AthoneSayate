import { NextRequest, NextResponse } from "next/server";
import webPush from "web-push";
import { differenceInCalendarDays, parseISO, subDays } from "date-fns";
import { createSupabaseBrowserClient } from "@athonesayate/shared/supabase";
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
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured." }, { status: 500 });
  }
  webPush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", vapidPublicKey, vapidPrivateKey);

  const supabase = createSupabaseBrowserClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const today = referenceDate();
  const paymentLookback = subDays(today, 45).toISOString().slice(0, 10);

  const [rulesResult, transactionsResult, subscriptionsResult] = await Promise.all([
    supabase.from("recurring_rules").select("*").eq("active", true),
    supabase.from("transactions").select("*").gte("occurred_on", paymentLookback),
    supabase.from("push_subscriptions").select("endpoint, p256dh, auth")
  ]);

  const firstError = rulesResult.error ?? transactionsResult.error ?? subscriptionsResult.error;
  if (firstError) {
    return NextResponse.json({ error: firstError.message }, { status: 500 });
  }

  const subscriptions = subscriptionsResult.data ?? [];
  if (subscriptions.length === 0) {
    return NextResponse.json({ sent: 0, due: 0, reason: "no subscriptions" });
  }

  const rules: RecurringRule[] = (rulesResult.data ?? []).map((row) => ({
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
  const transactions: Transaction[] = (transactionsResult.data ?? []).map((row) => ({
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
    return NextResponse.json({ sent: 0, due: 0 });
  }

  const formatAmount = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
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

  let sent = 0;
  const stale: string[] = [];
  await Promise.all(
    subscriptions.map(async (subscription) => {
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

  if (stale.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return NextResponse.json({ sent, due: dueBills.length, staleRemoved: stale.length });
}
