-- Links recurring rules to optional subcategories.
-- Run after 003_subcategories.sql.

alter table public.recurring_rules
add column if not exists subcategory_id uuid references public.subcategories(id) on delete set null;

create index if not exists recurring_subcategory_idx on public.recurring_rules(subcategory_id);
