-- Simplify the schema: payment-info kaldırıldı, sadece "ayın kaçında ödeme günü" takibi.
-- Bu migration eski şemadan yeni şemaya geçişi sağlar.

-- 1. Artık kullanılmayan tabloları sil
drop table if exists public.payments cascade;
drop table if exists public.settings cascade;

-- 2. Eski indeksleri (varsa) düşür
drop index if exists public.idx_subscribers_end_date;
drop index if exists public.idx_subscribers_last_reminder_sent_at;
drop index if exists public.idx_pre_reminder;
drop index if exists public.idx_due_reminder;
drop index if exists public.idx_last_overdue_reminder;

-- 3. Eski kolonları kaldır (ödeme/fiyat/otomatik hatırlatma izleri)
alter table public.subscribers
  drop column if exists monthly_fee,
  drop column if exists start_date,
  drop column if exists end_date,
  drop column if exists last_reminder_sent_at,
  drop column if exists pre_reminder_sent_at,
  drop column if exists due_reminder_sent_at,
  drop column if exists last_overdue_reminder_sent_at;

-- 4. Yeni kolonlar
alter table public.subscribers
  add column if not exists vehicle_type text not null default 'OTOMOBIL'
    check (vehicle_type in ('OTOMOBIL','MOTOR')),
  add column if not exists payment_day integer not null default 1
    check (payment_day between 1 and 31),
  add column if not exists last_paid_at date;

-- Bazı abonelerin telefonu yok; phone'u nullable yap
alter table public.subscribers alter column phone drop not null;

-- 5. status kontrol kısıtını sadeleştir: artık 'overdue' DB'de tutulmuyor (UI'da hesaplanacak)
alter table public.subscribers drop constraint if exists subscribers_status_check;
alter table public.subscribers
  add constraint subscribers_status_check
  check (status in ('active','cancelled'));

update public.subscribers set status = 'active' where status not in ('active','cancelled');

-- 6. Yeni indeksler
create index if not exists idx_subscribers_payment_day on public.subscribers(payment_day);
create index if not exists idx_subscribers_vehicle_type on public.subscribers(vehicle_type);
create index if not exists idx_subscribers_last_paid_at on public.subscribers(last_paid_at);
