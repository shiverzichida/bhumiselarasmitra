-- Prevent silent lost updates, make shipment saves atomic, and persist audit history.
alter table public.shipments
  add column if not exists legacy_duplicate boolean not null default false;

-- Preserve the older conflicting business document, but exclude it from the
-- uniqueness rule so no existing data is deleted or silently merged.
update public.shipments
set legacy_duplicate = true
where id = 'a4a37760-85a6-499d-9fde-2e27bb3ace9c'
  and bl_number = 'BSMKIJ250723001';

create unique index if not exists shipments_owner_bl_unique
  on public.shipments (owner_id, lower(btrim(bl_number)))
  where nullif(btrim(bl_number), '') is not null and not legacy_duplicate;

create table if not exists public.shipment_audit_logs (
  id bigint generated always as identity primary key,
  shipment_id uuid not null,
  owner_id uuid not null,
  actor_id uuid,
  actor_email text,
  source_table text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  changed_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);

create index if not exists shipment_audit_logs_owner_changed_idx
  on public.shipment_audit_logs (owner_id, changed_at desc);
create index if not exists shipment_audit_logs_shipment_changed_idx
  on public.shipment_audit_logs (shipment_id, changed_at desc);

alter table public.shipment_audit_logs enable row level security;
drop policy if exists shipment_audit_logs_select_own on public.shipment_audit_logs;
create policy shipment_audit_logs_select_own
on public.shipment_audit_logs for select to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.shipment_audit_logs from anon;
grant select on public.shipment_audit_logs to authenticated;

create schema if not exists private;

create or replace function private.audit_shipment_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shipment_id uuid;
  v_owner_id uuid;
  v_before jsonb;
  v_after jsonb;
begin
  v_before := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_after := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_shipment_id := case
    when tg_table_name = 'shipments' then coalesce(new.id, old.id)
    else coalesce(new.shipment_id, old.shipment_id)
  end;
  select s.owner_id into v_owner_id
  from public.shipments s where s.id = v_shipment_id;
  v_owner_id := coalesce(v_owner_id, (v_before ->> 'owner_id')::uuid, (select auth.uid()));

  insert into public.shipment_audit_logs (
    shipment_id, owner_id, actor_id, actor_email, source_table,
    operation, before_data, after_data
  ) values (
    v_shipment_id, v_owner_id, (select auth.uid()),
    (select auth.jwt() ->> 'email'), tg_table_name,
    tg_op, v_before, v_after
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.audit_shipment_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['shipments','shipment_containers','shipment_cargo_items','invoice_items'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit_change', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I for each row execute function private.audit_shipment_change()',
      t || '_audit_change', t
    );
  end loop;
end $$;

create or replace function public.save_shipment_atomic(
  p_shipment_id uuid,
  p_expected_updated_at timestamptz,
  p_shipment jsonb,
  p_containers jsonb,
  p_cargo_items jsonb,
  p_invoice_items jsonb
)
returns table (id uuid, updated_at timestamptz)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
  v_now timestamptz := clock_timestamp();
  v_existing public.shipments%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception using errcode = '42501', message = 'Authentication required';
  end if;

  if p_shipment_id is null then
    insert into public.shipments (
      owner_id, document_batch, si_number, bl_number, invoice_number, issue_date,
      etd, eta, shipped_on_board, stuffing_date, booking_number, freight_term,
      trade_term, place_of_loading, port_of_loading, port_of_discharge,
      final_destination, vessel, voyage, connecting_vessel, detention_note,
      shipper, consignee, notify_party, carrier, attention, bill_to, payment_note,
      bank_name, bank_account_number, bank_account_name, signer_name, signer_title,
      updated_at
    ) values (
      (select auth.uid()), p_shipment->>'document_batch', p_shipment->>'si_number',
      nullif(btrim(p_shipment->>'bl_number'), ''), p_shipment->>'invoice_number',
      nullif(p_shipment->>'issue_date','')::date, nullif(p_shipment->>'etd','')::date,
      nullif(p_shipment->>'eta','')::date, nullif(p_shipment->>'shipped_on_board','')::date,
      nullif(p_shipment->>'stuffing_date','')::date, p_shipment->>'booking_number',
      p_shipment->>'freight_term', p_shipment->>'trade_term', p_shipment->>'place_of_loading',
      p_shipment->>'port_of_loading', p_shipment->>'port_of_discharge',
      p_shipment->>'final_destination', p_shipment->>'vessel', p_shipment->>'voyage',
      p_shipment->>'connecting_vessel', p_shipment->>'detention_note', p_shipment->>'shipper',
      p_shipment->>'consignee', p_shipment->>'notify_party', p_shipment->>'carrier',
      p_shipment->>'attention', p_shipment->>'bill_to', p_shipment->>'payment_note',
      p_shipment->>'bank_name', p_shipment->>'bank_account_number',
      p_shipment->>'bank_account_name', p_shipment->>'signer_name',
      p_shipment->>'signer_title', v_now
    ) returning shipments.id into v_id;
  else
    select * into v_existing from public.shipments s
    where s.id = p_shipment_id and s.owner_id = (select auth.uid()) for update;
    if not found then
      raise exception using errcode = '42501', message = 'Shipment not found or access denied';
    end if;
    if p_expected_updated_at is null or v_existing.updated_at <> p_expected_updated_at then
      raise exception using errcode = '40001', message = 'SAVE_CONFLICT: shipment was changed by another device';
    end if;
    v_id := p_shipment_id;
    update public.shipments set
      document_batch=p_shipment->>'document_batch', si_number=p_shipment->>'si_number',
      bl_number=nullif(btrim(p_shipment->>'bl_number'), ''), invoice_number=p_shipment->>'invoice_number',
      issue_date=nullif(p_shipment->>'issue_date','')::date, etd=nullif(p_shipment->>'etd','')::date,
      eta=nullif(p_shipment->>'eta','')::date, shipped_on_board=nullif(p_shipment->>'shipped_on_board','')::date,
      stuffing_date=nullif(p_shipment->>'stuffing_date','')::date, booking_number=p_shipment->>'booking_number',
      freight_term=p_shipment->>'freight_term', trade_term=p_shipment->>'trade_term',
      place_of_loading=p_shipment->>'place_of_loading', port_of_loading=p_shipment->>'port_of_loading',
      port_of_discharge=p_shipment->>'port_of_discharge', final_destination=p_shipment->>'final_destination',
      vessel=p_shipment->>'vessel', voyage=p_shipment->>'voyage', connecting_vessel=p_shipment->>'connecting_vessel',
      detention_note=p_shipment->>'detention_note', shipper=p_shipment->>'shipper', consignee=p_shipment->>'consignee',
      notify_party=p_shipment->>'notify_party', carrier=p_shipment->>'carrier', attention=p_shipment->>'attention',
      bill_to=p_shipment->>'bill_to', payment_note=p_shipment->>'payment_note', bank_name=p_shipment->>'bank_name',
      bank_account_number=p_shipment->>'bank_account_number', bank_account_name=p_shipment->>'bank_account_name',
      signer_name=p_shipment->>'signer_name', signer_title=p_shipment->>'signer_title', updated_at=v_now
    where shipments.id=v_id;
  end if;

  delete from public.shipment_containers where shipment_id=v_id;
  insert into public.shipment_containers (shipment_id,container_number,seal_number,container_type,gross_weight,net_weight,measurement,sort_order)
  select v_id,x.container_number,x.seal_number,x.container_type,x.gross_weight,x.net_weight,x.measurement,x.sort_order
  from jsonb_to_recordset(coalesce(p_containers,'[]'::jsonb)) as x(container_number text,seal_number text,container_type text,gross_weight text,net_weight text,measurement text,sort_order int);

  delete from public.shipment_cargo_items where shipment_id=v_id;
  insert into public.shipment_cargo_items (shipment_id,marks,description,packages,gross_weight,net_weight,measurement,sort_order)
  select v_id,x.marks,x.description,x.packages,x.gross_weight,x.net_weight,x.measurement,x.sort_order
  from jsonb_to_recordset(coalesce(p_cargo_items,'[]'::jsonb)) as x(marks text,description text,packages text,gross_weight text,net_weight text,measurement text,sort_order int);

  delete from public.invoice_items where shipment_id=v_id;
  insert into public.invoice_items (shipment_id,description,quantity,unit,unit_price,sort_order)
  select v_id,x.description,coalesce(x.quantity,0),x.unit,coalesce(x.unit_price,0),x.sort_order
  from jsonb_to_recordset(coalesce(p_invoice_items,'[]'::jsonb)) as x(description text,quantity numeric,unit text,unit_price numeric,sort_order int);

  return query select v_id, v_now;
exception
  when unique_violation then
    raise exception using errcode='23505', message='DUPLICATE_BL: nomor B/L sudah digunakan pada shipment lain';
end;
$$;

revoke all on function public.save_shipment_atomic(uuid,timestamptz,jsonb,jsonb,jsonb,jsonb) from public, anon;
grant execute on function public.save_shipment_atomic(uuid,timestamptz,jsonb,jsonb,jsonb,jsonb) to authenticated;
