-- Auth groundwork. Additive and idempotent: this migration does NOT change any
-- policy and does NOT add the auth.users foreign key, so the existing no-auth
-- build keeps working exactly as before after running it.
--
-- Run order for the auth rollout:
--   1. this file
--   2. deploy the client auth changes and sign up your real account
--   3. select public.claim_legacy_data('<your-auth-uid>');
--   4. 008_auth_lockdown.sql
--
-- Back up the project (Supabase dashboard -> Database -> Backups, or
-- `supabase db dump`) before step 3. Step 3 moves every demo-owned row.

create extension if not exists "pgcrypto";

-- The fixed user id used by the pre-auth build.
create or replace function public.legacy_demo_user_id()
returns uuid
language sql
immutable
as $$
  select '00000000-0000-0000-0000-000000000001'::uuid;
$$;

-- ---------------------------------------------------------------------------
-- Starter data for a newly signed-up user.
--
-- A fresh account has no accounts and no categories, and the app has no
-- create-account form, so Quick Add would be unusable without this.
-- ---------------------------------------------------------------------------
create or replace function public.seed_new_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_food uuid;
  v_transport uuid;
  v_bills uuid;
begin
  -- accounts has no natural unique key, so guard the insert explicitly rather
  -- than relying on on-conflict.
  if not exists (select 1 from public.accounts where user_id = p_user_id) then
    insert into public.accounts (user_id, name, type, opening_balance, color)
    values (p_user_id, 'Cash Wallet', 'cash', 0, '#c3833d');
  end if;

  insert into public.categories (user_id, name, kind, icon, color)
  values (p_user_id, 'Salary', 'income', 'briefcase', '#5e7c62')
  on conflict (user_id, name, kind) do nothing;

  insert into public.categories (user_id, name, kind, icon, color)
  values
    (p_user_id, 'Housing', 'expense', 'home', '#7d536d'),
    (p_user_id, 'Food', 'expense', 'utensils', '#c3833d'),
    (p_user_id, 'Transport', 'expense', 'car', '#3d7485'),
    (p_user_id, 'Bills', 'expense', 'receipt', '#bd5b4b'),
    (p_user_id, 'Entertainment', 'expense', 'ticket', '#5e7c62'),
    (p_user_id, 'Savings', 'expense', 'piggy-bank', '#7d536d')
  on conflict (user_id, name, kind) do nothing;

  select id into v_food from public.categories
    where user_id = p_user_id and name = 'Food' and kind = 'expense';
  select id into v_transport from public.categories
    where user_id = p_user_id and name = 'Transport' and kind = 'expense';
  select id into v_bills from public.categories
    where user_id = p_user_id and name = 'Bills' and kind = 'expense';

  insert into public.subcategories (user_id, category_id, name)
  values
    (p_user_id, v_food, 'Meal'),
    (p_user_id, v_food, 'Drink'),
    (p_user_id, v_food, 'Snack'),
    (p_user_id, v_food, 'Groceries'),
    (p_user_id, v_transport, 'Fuel'),
    (p_user_id, v_transport, 'Taxi'),
    (p_user_id, v_transport, 'Bus'),
    (p_user_id, v_transport, 'Parking'),
    (p_user_id, v_bills, 'Electricity'),
    (p_user_id, v_bills, 'Water'),
    (p_user_id, v_bills, 'Internet'),
    (p_user_id, v_bills, 'Phone')
  on conflict (user_id, category_id, name) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile creation on signup.
--
-- Every owned table has `user_id references app_users(id)`, so a profile row
-- must exist before the user can insert anything at all.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New User'
    )
  )
  on conflict (id) do nothing;

  perform public.seed_new_user(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Backfill: give any auth user that predates this migration a profile.
-- ---------------------------------------------------------------------------
insert into public.app_users (id, display_name)
select u.id, coalesce(nullif(split_part(coalesce(u.email, ''), '@', 1), ''), 'User')
from auth.users u
where not exists (select 1 from public.app_users a where a.id = u.id)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Claim the pre-auth demo dataset for a real account.
--
-- The child-table foreign keys are `on delete cascade` but not
-- `on update cascade`, so the demo primary key cannot simply be rewritten.
-- This reassigns each child table explicitly, then drops the demo profile.
--
-- Safety properties:
--   * refuses to run if the target already has real ledger data, so it can
--     never merge two populated datasets;
--   * removes only the untouched starter rows created by seed_new_user;
--   * idempotent - a second call is a no-op once the demo profile is gone;
--   * security definer, so it still works after 008 enables strict policies.
-- ---------------------------------------------------------------------------
create or replace function public.claim_legacy_data(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_demo uuid := public.legacy_demo_user_id();
  v_moved integer := 0;
  v_count integer;
begin
  if p_user_id is null or p_user_id = v_demo then
    raise exception 'claim_legacy_data: pass the uuid of a real auth user';
  end if;

  if not exists (select 1 from public.app_users where id = p_user_id) then
    raise exception 'claim_legacy_data: no profile for %. Sign up first.', p_user_id;
  end if;

  if not exists (select 1 from public.app_users where id = v_demo) then
    return 'Nothing to claim: the demo profile no longer exists.';
  end if;

  -- Refuse to clobber a target that has already been used for real.
  select count(*) into v_count from public.transactions where user_id = p_user_id;
  if v_count > 0 then
    raise exception
      'claim_legacy_data: target user already has % transactions. Refusing to merge two datasets.',
      v_count;
  end if;

  select count(*) into v_count from public.recurring_rules where user_id = p_user_id;
  if v_count > 0 then
    raise exception
      'claim_legacy_data: target user already has % recurring rules. Refusing to merge two datasets.',
      v_count;
  end if;

  -- Drop the starter rows seeded at signup. Safe: the guards above proved the
  -- target has no transactions or rules, so nothing references them.
  delete from public.budgets where user_id = p_user_id;
  delete from public.subcategories where user_id = p_user_id;
  delete from public.categories where user_id = p_user_id;
  delete from public.accounts where user_id = p_user_id;
  delete from public.goals where user_id = p_user_id;
  delete from public.tags where user_id = p_user_id;

  -- Reassign every demo-owned row. Order is irrelevant: user_id is not part of
  -- any child-to-child foreign key.
  update public.accounts         set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  update public.categories       set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  update public.subcategories    set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  update public.transactions     set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  update public.budgets          set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  update public.recurring_rules  set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  update public.goals            set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  update public.tags             set user_id = p_user_id where user_id = v_demo;
  get diagnostics v_count = row_count; v_moved := v_moved + v_count;

  -- Optional: databases that never applied 006_push_subscriptions.sql do not
  -- have this table, and a missing reminder subscription must not abort a claim.
  if to_regclass('public.push_subscriptions') is not null then
    execute format(
      'update public.push_subscriptions set user_id = %L where user_id = %L',
      p_user_id, v_demo
    );
    get diagnostics v_count = row_count; v_moved := v_moved + v_count;
  end if;

  -- Carry over the demo display preferences, then retire the demo profile.
  update public.app_users target
  set currency = demo.currency,
      month_start_day = demo.month_start_day
  from public.app_users demo
  where target.id = p_user_id and demo.id = v_demo;

  delete from public.app_users where id = v_demo;

  return format('Claimed %s rows for %s.', v_moved, p_user_id);
end;
$$;

revoke all on function public.claim_legacy_data(uuid) from public, anon, authenticated;
