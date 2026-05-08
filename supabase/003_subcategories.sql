-- Adds category subcategories and links transactions to them.
-- Run after 001_expense_tracker_schema.sql.

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

alter table public.transactions
add column if not exists subcategory_id uuid references public.subcategories(id) on delete set null;

drop trigger if exists touch_subcategories_updated_at on public.subcategories;
create trigger touch_subcategories_updated_at before update on public.subcategories
for each row execute function public.touch_updated_at();

create index if not exists subcategories_category_idx on public.subcategories(category_id);
create index if not exists transactions_subcategory_idx on public.transactions(subcategory_id);

alter table public.subcategories enable row level security;

drop policy if exists "dev open access subcategories" on public.subcategories;
create policy "dev open access subcategories" on public.subcategories for all using (true) with check (true);

insert into public.subcategories (user_id, category_id, name)
select c.user_id, c.id, v.name
from public.categories c
join (values
  ('Bills', 'Electricity'),
  ('Bills', 'Water'),
  ('Bills', 'Internet'),
  ('Bills', 'Phone'),
  ('Food', 'Meal'),
  ('Food', 'Drink'),
  ('Food', 'Snack'),
  ('Food', 'Groceries'),
  ('Transport', 'Fuel'),
  ('Transport', 'Taxi'),
  ('Transport', 'Bus'),
  ('Transport', 'Parking'),
  ('Housing', 'Rent'),
  ('Housing', 'Maintenance'),
  ('Entertainment', 'Movie'),
  ('Entertainment', 'Game'),
  ('Health', 'Medicine'),
  ('Health', 'Clinic'),
  ('Savings', 'Emergency Fund'),
  ('Savings', 'Travel Fund')
) as v(category_name, name) on v.category_name = c.name
on conflict (user_id, category_id, name) do nothing;
