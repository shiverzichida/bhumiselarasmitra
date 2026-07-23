create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid default auth.uid(),
  document_batch text not null,
  si_number text,
  bl_number text,
  invoice_number text,
  issue_date date,
  etd date,
  eta date,
  shipped_on_board date,
  stuffing_date date,
  booking_number text,
  freight_term text,
  trade_term text,
  place_of_loading text,
  port_of_loading text,
  port_of_discharge text,
  final_destination text,
  vessel text,
  voyage text,
  connecting_vessel text,
  detention_note text,
  shipper text,
  consignee text,
  notify_party text,
  carrier text,
  attention text,
  bill_to text,
  payment_note text,
  bank_name text,
  bank_account_number text,
  bank_account_name text,
  signer_name text,
  signer_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipment_containers (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  container_number text,
  seal_number text,
  container_type text,
  gross_weight text,
  net_weight text,
  measurement text,
  sort_order integer not null default 0
);

create table if not exists public.shipment_cargo_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  marks text,
  description text,
  packages text,
  gross_weight text,
  net_weight text,
  measurement text,
  sort_order integer not null default 0
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  description text,
  quantity numeric(12,2) not null default 0,
  unit text,
  unit_price numeric(14,2) not null default 0,
  sort_order integer not null default 0
);

alter table public.shipments enable row level security;
alter table public.shipment_containers enable row level security;
alter table public.shipment_cargo_items enable row level security;
alter table public.invoice_items enable row level security;

drop policy if exists "shipments_select_own" on public.shipments;
create policy "shipments_select_own"
on public.shipments
for select
to authenticated
using (owner_id = auth.uid());

drop policy if exists "shipments_insert_own" on public.shipments;
create policy "shipments_insert_own"
on public.shipments
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "shipments_update_own" on public.shipments;
create policy "shipments_update_own"
on public.shipments
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "shipments_delete_own" on public.shipments;
create policy "shipments_delete_own"
on public.shipments
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "shipment_containers_owner_access" on public.shipment_containers;
create policy "shipment_containers_owner_access"
on public.shipment_containers
for all
to authenticated
using (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_containers.shipment_id
      and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_containers.shipment_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists "shipment_cargo_items_owner_access" on public.shipment_cargo_items;
create policy "shipment_cargo_items_owner_access"
on public.shipment_cargo_items
for all
to authenticated
using (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_cargo_items.shipment_id
      and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shipments s
    where s.id = shipment_cargo_items.shipment_id
      and s.owner_id = auth.uid()
  )
);

drop policy if exists "invoice_items_owner_access" on public.invoice_items;
create policy "invoice_items_owner_access"
on public.invoice_items
for all
to authenticated
using (
  exists (
    select 1
    from public.shipments s
    where s.id = invoice_items.shipment_id
      and s.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.shipments s
    where s.id = invoice_items.shipment_id
      and s.owner_id = auth.uid()
  )
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shipments_set_updated_at on public.shipments;
create trigger shipments_set_updated_at
before update on public.shipments
for each row
execute function public.set_updated_at();
