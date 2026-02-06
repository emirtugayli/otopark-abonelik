-- Add last_reminder_sent_at to avoid daily spam
alter table public.subscribers
  add column if not exists last_reminder_sent_at timestamp without time zone;

create index if not exists idx_subscribers_last_reminder_sent_at
  on public.subscribers(last_reminder_sent_at);

