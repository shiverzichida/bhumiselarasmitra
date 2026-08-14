create table if not exists public.user_drafts (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null default auth.uid(),
  draft_type text not null check (draft_type in ('shipment','standalone_invoice')),
  payload jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now(),
  unique(owner_id,draft_type)
);
create table if not exists public.activity_logs (
  id bigint generated always as identity primary key, owner_id uuid not null default auth.uid(),
  actor_email text, document_batch text, si_number text, bl_number text, invoice_number text,
  changed_fields text not null, created_at timestamptz not null default now()
);
alter table public.user_drafts enable row level security;
alter table public.activity_logs enable row level security;
create policy user_drafts_owner_access on public.user_drafts for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy activity_logs_owner_access on public.activity_logs for all to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
grant select,insert,update,delete on public.user_drafts to authenticated;
grant select,insert,delete on public.activity_logs to authenticated;
grant usage,select on sequence public.activity_logs_id_seq to authenticated;
create index if not exists user_drafts_owner_type_idx on public.user_drafts(owner_id,draft_type);
create index if not exists activity_logs_owner_created_idx on public.activity_logs(owner_id,created_at desc);
