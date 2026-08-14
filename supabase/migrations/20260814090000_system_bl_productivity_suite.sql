-- Productivity suite: cloud master data, archive/restore, and faster RLS queries.
alter table public.shipments add column if not exists archived_at timestamptz;
alter table public.standalone_invoices add column if not exists archived_at timestamptz;

create table if not exists public.master_data (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  category text not null check (category in ('shipper','consignee','notify_party','carrier','port','vessel','charge')),
  label text not null,
  value text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, category, label)
);

alter table public.master_data enable row level security;
drop policy if exists master_data_owner_access on public.master_data;
create policy master_data_owner_access on public.master_data for all to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.master_data to authenticated;
grant select, insert, update, delete on public.customers_master to authenticated;
grant select, insert, update, delete on public.standalone_invoices to authenticated;
grant select, insert, update, delete on public.standalone_invoice_items to authenticated;
grant select, update on public.shipments to authenticated;

create index if not exists shipments_owner_archived_updated_idx on public.shipments(owner_id, archived_at, updated_at desc);
create index if not exists customers_master_owner_company_idx on public.customers_master(owner_id, company_name);
create index if not exists standalone_invoices_owner_archived_date_idx on public.standalone_invoices(owner_id, archived_at, date desc);
create index if not exists standalone_invoice_items_invoice_id_idx on public.standalone_invoice_items(invoice_id);
create index if not exists master_data_owner_category_label_idx on public.master_data(owner_id, category, label);
create index if not exists shipment_containers_shipment_id_idx on public.shipment_containers(shipment_id);
create index if not exists shipment_cargo_items_shipment_id_idx on public.shipment_cargo_items(shipment_id);
create index if not exists invoice_items_shipment_id_idx on public.invoice_items(shipment_id);

alter function public.set_updated_at() set search_path = '';

drop trigger if exists master_data_set_updated_at on public.master_data;
create trigger master_data_set_updated_at before update on public.master_data
for each row execute function public.set_updated_at();

-- Existing tables already use owner-scoped RLS. Recreate the most frequently
-- scanned policies with auth.uid() cached once per statement.
drop policy if exists customers_master_owner_access on public.customers_master;
create policy customers_master_owner_access on public.customers_master for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
drop policy if exists standalone_invoices_owner_access on public.standalone_invoices;
create policy standalone_invoices_owner_access on public.standalone_invoices for all to authenticated
using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
