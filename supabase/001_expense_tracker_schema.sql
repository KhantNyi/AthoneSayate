-- Expense Tracker schema without auth requirements.
-- Paste this into the Supabase SQL editor, or run it through the Supabase CLI.
-- This version uses a shared demo user id so the app can work before auth is added.

create extension if not exists "pgcrypto";

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Demo User',
  currency text not null default 'USD',
  month_start_day integer not null default 1 check (month_start_day between 1 and 28),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('cash', 'checking', 'savings', 'credit_card', 'wallet', 'investment')),
  opening_balance numeric(12,2) not null default 0,
  color text not null default '#3d7485',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  icon text not null default 'circle',
  color text not null default '#5e7c62',
  monthly_budget numeric(12,2),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, kind)
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, name)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  type text not null check (type in ('income', 'expense', 'transfer')),
  amount numeric(12,2) not null check (amount >= 0),
  occurred_on date not null default current_date,
  merchant text not null default '',
  notes text not null default '',
  is_recurring boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  month date not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, month)
);

create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  subcategory_id uuid references public.subcategories(id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12,2) not null check (amount >= 0),
  merchant text not null,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  next_due_on date not null,
  auto_create boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  current_amount numeric(12,2) not null default 0 check (current_amount >= 0),
  target_date date,
  color text not null default '#7d536d',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.transaction_tags (
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (transaction_id, tag_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_app_users_updated_at on public.app_users;
create trigger touch_app_users_updated_at before update on public.app_users
for each row execute function public.touch_updated_at();

drop trigger if exists touch_accounts_updated_at on public.accounts;
create trigger touch_accounts_updated_at before update on public.accounts
for each row execute function public.touch_updated_at();

drop trigger if exists touch_categories_updated_at on public.categories;
create trigger touch_categories_updated_at before update on public.categories
for each row execute function public.touch_updated_at();

drop trigger if exists touch_subcategories_updated_at on public.subcategories;
create trigger touch_subcategories_updated_at before update on public.subcategories
for each row execute function public.touch_updated_at();

drop trigger if exists touch_transactions_updated_at on public.transactions;
create trigger touch_transactions_updated_at before update on public.transactions
for each row execute function public.touch_updated_at();

drop trigger if exists touch_budgets_updated_at on public.budgets;
create trigger touch_budgets_updated_at before update on public.budgets
for each row execute function public.touch_updated_at();

drop trigger if exists touch_recurring_rules_updated_at on public.recurring_rules;
create trigger touch_recurring_rules_updated_at before update on public.recurring_rules
for each row execute function public.touch_updated_at();

drop trigger if exists touch_goals_updated_at on public.goals;
create trigger touch_goals_updated_at before update on public.goals
for each row execute function public.touch_updated_at();

create index if not exists transactions_user_date_idx on public.transactions(user_id, occurred_on desc);
create index if not exists transactions_category_idx on public.transactions(category_id);
create index if not exists subcategories_category_idx on public.subcategories(category_id);
create index if not exists transactions_subcategory_idx on public.transactions(subcategory_id);
create index if not exists recurring_subcategory_idx on public.recurring_rules(subcategory_id);
create index if not exists budgets_user_month_idx on public.budgets(user_id, month);
create index if not exists recurring_user_due_idx on public.recurring_rules(user_id, next_due_on) where active = true;

alter table public.app_users enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;
alter table public.recurring_rules enable row level security;
alter table public.goals enable row level security;
alter table public.tags enable row level security;
alter table public.transaction_tags enable row level security;

-- Development policies for no-auth mode. Replace these when Supabase Auth is introduced.
drop policy if exists "dev open access app_users" on public.app_users;
create policy "dev open access app_users" on public.app_users for all using (true) with check (true);

drop policy if exists "dev open access accounts" on public.accounts;
create policy "dev open access accounts" on public.accounts for all using (true) with check (true);

drop policy if exists "dev open access categories" on public.categories;
create policy "dev open access categories" on public.categories for all using (true) with check (true);

drop policy if exists "dev open access subcategories" on public.subcategories;
create policy "dev open access subcategories" on public.subcategories for all using (true) with check (true);

drop policy if exists "dev open access transactions" on public.transactions;
create policy "dev open access transactions" on public.transactions for all using (true) with check (true);

drop policy if exists "dev open access budgets" on public.budgets;
create policy "dev open access budgets" on public.budgets for all using (true) with check (true);

drop policy if exists "dev open access recurring_rules" on public.recurring_rules;
create policy "dev open access recurring_rules" on public.recurring_rules for all using (true) with check (true);

drop policy if exists "dev open access goals" on public.goals;
create policy "dev open access goals" on public.goals for all using (true) with check (true);

drop policy if exists "dev open access tags" on public.tags;
create policy "dev open access tags" on public.tags for all using (true) with check (true);

drop policy if exists "dev open access transaction_tags" on public.transaction_tags;
create policy "dev open access transaction_tags" on public.transaction_tags for all using (true) with check (true);
