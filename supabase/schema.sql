-- SQL Database Schema for KVJ Family Expense & Income App

-- 1. Create families table
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Insert the default family (Single Family private setup)
insert into public.families (id, name, invite_code)
values ('d7715b74-124b-48c0-82cc-49d609dbb184', 'ครอบครัวของเรา', 'KVJFAMILY')
on conflict (id) do nothing;

-- 3. Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  family_id uuid references public.families(id) on delete set null default 'd7715b74-124b-48c0-82cc-49d609dbb184',
  display_name text not null,
  avatar_url text,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Create transactions table (Includes income and expenses)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null default 'd7715b74-124b-48c0-82cc-49d609dbb184',
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(12, 2) not null check (amount > 0),
  description text not null,
  category text not null,
  transaction_date date default current_date not null,
  receipt_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Create settlements table
create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null default 'd7715b74-124b-48c0-82cc-49d609dbb184',
  payer_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade not null,
  amount numeric(12, 2) not null check (amount > 0),
  settlement_date date default current_date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Create savings_goals table
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.families(id) on delete cascade not null default 'd7715b74-124b-48c0-82cc-49d609dbb184',
  target_amount numeric(12, 2) not null check (target_amount >= 0),
  month date not null unique, -- Represents the 1st of the month, e.g. '2026-05-01'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Trigger to automatically create a profile for new auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, family_id, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'd7715b74-124b-48c0-82cc-49d609dbb184',
    'member'
  )
  on conflict (id) do update
  set display_name = excluded.display_name, family_id = excluded.family_id;
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Row Level Security (RLS)
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.settlements enable row level security;
alter table public.savings_goals enable row level security;

-- Policies for families
drop policy if exists "Users can view their own family" on public.families;
create policy "Users can view their own family"
  on public.families for select
  using (id in (select family_id from public.profiles where id = auth.uid()));

-- Policies for profiles
drop policy if exists "Users can view profiles in the same family" on public.profiles;
create policy "Users can view profiles in the same family"
  on public.profiles for select
  using (family_id in (select family_id from public.profiles where id = auth.uid()) or id = auth.uid());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Policies for transactions
drop policy if exists "Users can view transactions in the same family" on public.transactions;
create policy "Users can view transactions in the same family"
  on public.transactions for select
  using (family_id in (select family_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can insert transactions in their family" on public.transactions;
create policy "Users can insert transactions in their family"
  on public.transactions for insert
  with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
    and user_id = auth.uid()
  );

drop policy if exists "Users can update their own transactions" on public.transactions;
create policy "Users can update their own transactions"
  on public.transactions for update
  using (user_id = auth.uid());

drop policy if exists "Users can delete their own transactions" on public.transactions;
drop policy if exists "Only admins can delete transactions in their family" on public.transactions;
create policy "Only admins can delete transactions in their family"
  on public.transactions for delete
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    and family_id in (select family_id from public.profiles where id = auth.uid())
  );

-- Policies for settlements
drop policy if exists "Users can view settlements in the same family" on public.settlements;
create policy "Users can view settlements in the same family"
  on public.settlements for select
  using (family_id in (select family_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can insert settlements in their family" on public.settlements;
create policy "Users can insert settlements in their family"
  on public.settlements for insert
  with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
    and (payer_id = auth.uid() or receiver_id = auth.uid())
  );

-- Policies for savings_goals
drop policy if exists "Users can view savings goals in the same family" on public.savings_goals;
create policy "Users can view savings goals in the same family"
  on public.savings_goals for select
  using (family_id in (select family_id from public.profiles where id = auth.uid()));

drop policy if exists "Users can manage savings goals in the same family" on public.savings_goals;
create policy "Users can manage savings goals in the same family"
  on public.savings_goals for all
  using (family_id in (select family_id from public.profiles where id = auth.uid()));
