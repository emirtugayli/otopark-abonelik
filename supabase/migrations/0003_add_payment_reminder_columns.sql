-- Add detailed payment reminder lifecycle timestamps
alter table public.subscribers
  add column if not exists pre_reminder_sent_at timestamp without time zone,
  add column if not exists due_reminder_sent_at timestamp without time zone,
  add column if not exists last_overdue_reminder_sent_at timestamp without time zone;

create index if not exists idx_pre_reminder
  on public.subscribers(pre_reminder_sent_at);

create index if not exists idx_due_reminder
  on public.subscribers(due_reminder_sent_at);

create index if not exists idx_last_overdue_reminder
  on public.subscribers(last_overdue_reminder_sent_at);

