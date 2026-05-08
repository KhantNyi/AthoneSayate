-- Optional demo data for the no-auth build.
-- Run after 001_expense_tracker_schema.sql.

insert into public.app_users (id, display_name, currency, month_start_day)
values ('00000000-0000-0000-0000-000000000001', 'Demo User', 'USD', 1)
on conflict (id) do update set display_name = excluded.display_name;

insert into public.accounts (id, user_id, name, type, opening_balance, color) values
('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Everyday Checking', 'checking', 4200, '#3d7485'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Cash Wallet', 'cash', 180, '#c3833d'),
('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Rewards Card', 'credit_card', -620, '#bd5b4b')
on conflict (id) do nothing;

insert into public.categories (id, user_id, name, kind, icon, color, monthly_budget) values
('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Salary', 'income', 'briefcase', '#5e7c62', null),
('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Housing', 'expense', 'home', '#7d536d', 1600),
('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Food', 'expense', 'utensils', '#c3833d', 650),
('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Transport', 'expense', 'car', '#3d7485', 320),
('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Bills', 'expense', 'receipt', '#bd5b4b', 440),
('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Entertainment', 'expense', 'ticket', '#5e7c62', 260),
('20000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Savings', 'expense', 'piggy-bank', '#7d536d', 800)
on conflict (id) do nothing;

insert into public.transactions (user_id, account_id, category_id, type, amount, occurred_on, merchant, notes, is_recurring) values
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'income', 5200, date_trunc('month', current_date)::date + 0, 'Acme Payroll', 'Monthly salary', true),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'expense', 1480, date_trunc('month', current_date)::date + 1, 'Oak Street Apartments', 'Rent', true),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'expense', 86.40, current_date - 2, 'Market Basket', 'Groceries', false),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'expense', 28.50, current_date - 1, 'Noodle House', 'Dinner', false),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', 'expense', 54.20, current_date - 4, 'Metro Transit', 'Monthly top-up', false),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'expense', 92.00, current_date - 6, 'City Power', 'Electric bill', true),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', 'expense', 44.00, current_date - 3, 'Cinema', 'Tickets', false),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', 'expense', 500.00, current_date - 5, 'High Yield Savings', 'Automatic transfer', true);

insert into public.recurring_rules (user_id, account_id, category_id, type, amount, merchant, frequency, next_due_on, auto_create) values
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', 'expense', 1480, 'Oak Street Apartments', 'monthly', date_trunc('month', current_date)::date + interval '1 month' + interval '1 day', false),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'expense', 18.99, 'Streamly', 'monthly', current_date + 7, false),
('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'income', 5200, 'Acme Payroll', 'monthly', date_trunc('month', current_date)::date + interval '1 month', false);

insert into public.goals (user_id, name, target_amount, current_amount, target_date, color) values
('00000000-0000-0000-0000-000000000001', 'Emergency Fund', 12000, 4300, current_date + 220, '#7d536d'),
('00000000-0000-0000-0000-000000000001', 'Japan Trip', 3500, 920, current_date + 150, '#3d7485');
