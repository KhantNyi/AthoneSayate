-- Explicitly links recurring bill payments to their rule and billing cycle.
-- Paid status becomes "a linked payment exists for this cycle" instead of
-- fuzzy merchant/amount matching, so it resets naturally on the 1st of the
-- next month and survives renaming or re-pricing a bill.
-- Run after 004_recurring_subcategories.sql.

alter table public.transactions
add column if not exists recurring_rule_id uuid references public.recurring_rules(id) on delete set null,
add column if not exists recurring_due_on date;

create index if not exists transactions_recurring_rule_idx
on public.transactions(recurring_rule_id)
where recurring_rule_id is not null;

-- Backfill the billing-cycle date from the legacy note format
-- ("Recorded from recurring item due YYYY-MM-DD").
update public.transactions
set recurring_due_on = substring(notes from 'due (\d{4}-\d{2}-\d{2})$')::date
where is_recurring
  and recurring_due_on is null
  and notes ~ 'due \d{4}-\d{2}-\d{2}$';

-- Link legacy generated payments to their rule by merchant + account.
update public.transactions t
set recurring_rule_id = r.id
from public.recurring_rules r
where t.recurring_rule_id is null
  and t.is_recurring
  and t.recurring_due_on is not null
  and r.user_id = t.user_id
  and r.account_id = t.account_id
  and r.type = t.type
  and lower(trim(r.merchant)) = lower(trim(coalesce(t.merchant, '')));
