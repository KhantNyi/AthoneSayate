-- Enforce per-user ownership. Run this LAST, after 007_auth.sql, after signing
-- up, and after `select public.claim_legacy_data('<your-auth-uid>');`.
--
-- This migration is a hard cutover:
--   * the pre-auth client stops working (it sends the demo user id, which no
--     longer passes the with-check on any table);
--   * an anonymous session sees zero rows everywhere;
--   * the push dispatch route must already use the service-role key.
--
-- It aborts rather than orphaning anything if the demo dataset is unclaimed.

do $$
begin
  if exists (select 1 from public.app_users where id = public.legacy_demo_user_id()) then
    raise exception using
      message = 'Demo dataset is still unclaimed.',
      hint = 'Run: select public.claim_legacy_data(''<your-auth-uid>''); before applying 008. Adding the auth.users foreign key now would orphan the demo rows.';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tie profiles to auth.users. Deleting the auth user now removes the profile,
-- which already cascades to every owned table.
-- ---------------------------------------------------------------------------
alter table public.app_users drop constraint if exists app_users_id_fkey;
alter table public.app_users
  add constraint app_users_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Ownership defaults, so inserts no longer have to pass user_id at all.
-- ---------------------------------------------------------------------------
alter table public.accounts           alter column user_id set default auth.uid();
alter table public.categories         alter column user_id set default auth.uid();
alter table public.subcategories      alter column user_id set default auth.uid();
alter table public.transactions       alter column user_id set default auth.uid();
alter table public.budgets            alter column user_id set default auth.uid();
alter table public.recurring_rules    alter column user_id set default auth.uid();
alter table public.goals              alter column user_id set default auth.uid();
alter table public.tags               alter column user_id set default auth.uid();

-- ---------------------------------------------------------------------------
-- Drop every development policy.
-- ---------------------------------------------------------------------------
drop policy if exists "dev open access app_users" on public.app_users;
drop policy if exists "dev open access accounts" on public.accounts;
drop policy if exists "dev open access categories" on public.categories;
drop policy if exists "dev open access subcategories" on public.subcategories;
drop policy if exists "dev open access transactions" on public.transactions;
drop policy if exists "dev open access budgets" on public.budgets;
drop policy if exists "dev open access recurring_rules" on public.recurring_rules;
drop policy if exists "dev open access goals" on public.goals;
drop policy if exists "dev open access tags" on public.tags;
drop policy if exists "dev open access transaction_tags" on public.transaction_tags;

-- Drop this migration's own policies too, so it can be re-run safely.
drop policy if exists "app_users select own" on public.app_users;
drop policy if exists "app_users update own" on public.app_users;
drop policy if exists "accounts own" on public.accounts;
drop policy if exists "categories own" on public.categories;
drop policy if exists "goals own" on public.goals;
drop policy if exists "tags own" on public.tags;
drop policy if exists "subcategories own" on public.subcategories;
drop policy if exists "transactions own" on public.transactions;
drop policy if exists "budgets own" on public.budgets;
drop policy if exists "recurring_rules own" on public.recurring_rules;
drop policy if exists "transaction_tags own" on public.transaction_tags;

-- push_subscriptions is optional: a database that never applied
-- 006_push_subscriptions.sql has no such table, and bill reminders are a
-- feature you can be running without.
do $$
begin
  if to_regclass('public.push_subscriptions') is null then
    raise notice 'Skipping push_subscriptions: table not present (006 not applied).';
    return;
  end if;

  alter table public.push_subscriptions alter column user_id set default auth.uid();
  alter table public.push_subscriptions enable row level security;

  drop policy if exists "dev open access push_subscriptions" on public.push_subscriptions;
  drop policy if exists "push_subscriptions own" on public.push_subscriptions;

  create policy "push_subscriptions own" on public.push_subscriptions
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile: readable and updatable by its owner only. No insert policy - the
-- signup trigger creates profiles, and no delete policy - account removal goes
-- through auth.users.
-- ---------------------------------------------------------------------------
create policy "app_users select own" on public.app_users
  for select to authenticated using (id = (select auth.uid()));

create policy "app_users update own" on public.app_users
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Ownership helpers.
--
-- `user_id = auth.uid()` alone is not sufficient on tables that reference other
-- user-owned rows: it would still allow attaching your own transaction to
-- someone else's account_id. These assert that a referenced row is yours.
-- Null ids pass, because those columns are nullable by design.
-- ---------------------------------------------------------------------------
create or replace function public.owns_account(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_id is null or exists (
    select 1 from public.accounts a where a.id = p_id and a.user_id = auth.uid()
  );
$$;

create or replace function public.owns_category(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_id is null or exists (
    select 1 from public.categories c where c.id = p_id and c.user_id = auth.uid()
  );
$$;

create or replace function public.owns_subcategory(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_id is null or exists (
    select 1 from public.subcategories s where s.id = p_id and s.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Leaf tables: ownership is the whole check.
-- ---------------------------------------------------------------------------
create policy "accounts own" on public.accounts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "categories own" on public.categories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "goals own" on public.goals
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "tags own" on public.tags
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Referencing tables: ownership plus every referenced row.
-- ---------------------------------------------------------------------------
create policy "subcategories own" on public.subcategories
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.owns_category(category_id)
  );

create policy "transactions own" on public.transactions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.owns_account(account_id)
    and public.owns_category(category_id)
    and public.owns_subcategory(subcategory_id)
  );

create policy "budgets own" on public.budgets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.owns_category(category_id)
  );

-- recurring_rules.subcategory_id only exists once 004_recurring_subcategories.sql
-- has been applied, and the data layer deliberately tolerates its absence, so
-- the subcategory check is added only when there is a column to check.
do $$
declare
  v_check text :=
    'user_id = (select auth.uid()) '
    'and public.owns_account(account_id) '
    'and public.owns_category(category_id)';
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recurring_rules'
      and column_name = 'subcategory_id'
  ) then
    v_check := v_check || ' and public.owns_subcategory(subcategory_id)';
  else
    raise notice 'recurring_rules.subcategory_id absent (004 not applied); policy omits the subcategory ownership check.';
  end if;

  execute format(
    'create policy "recurring_rules own" on public.recurring_rules '
    'for all to authenticated '
    'using (user_id = (select auth.uid())) '
    'with check (%s)',
    v_check
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- transaction_tags has no user_id: reach ownership through both parents.
-- ---------------------------------------------------------------------------
create policy "transaction_tags own" on public.transaction_tags
  for all to authenticated
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and t.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.tags g
      where g.id = tag_id and g.user_id = (select auth.uid())
    )
  );
