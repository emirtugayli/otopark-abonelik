-- Enable UUID generation (Supabase-compatible)
create extension if not exists "pgcrypto";

-- Subscribers table
create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  plate_number text not null,
  start_date date not null,
  end_date date not null,
  monthly_fee numeric not null,
  status text check (status in ('active','overdue','cancelled')) default 'active',
  created_at timestamp without time zone default now()
);

-- Payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.subscribers(id) on delete cascade,
  amount numeric not null,
  payment_date date not null,
  payment_method text default 'cash',
  created_at timestamp without time zone default now()
);

-- Indexes
create index if not exists idx_subscribers_status on public.subscribers(status);
create index if not exists idx_subscribers_end_date on public.subscribers(end_date);
create index if not exists idx_payments_subscriber_id on public.payments(subscriber_id);
create index if not exists idx_payments_payment_date on public.payments(payment_date);

