-- Web push subscriptions for bill-due reminders.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "dev open access push_subscriptions" on public.push_subscriptions;
create policy "dev open access push_subscriptions" on public.push_subscriptions for all using (true) with check (true);
