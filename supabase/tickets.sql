-- Skema buat fitur Tiket Support (customer bikin tiket, admin balas).
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor.
--
-- Domain baru, sengaja TIDAK numpang di tabel orders/dll (beda dari SMM yang
-- memang cocok numpang karena orders udah generik) — tiket nggak ada
-- hubungannya sama pesanan produk sama sekali.
--
-- Semua tulis (insert/update) lewat RPC SECURITY DEFINER, sama pola dengan
-- buy_with_saldo/buy_smm_with_saldo/admin_update_order_status yang udah ada —
-- RLS tabel di bawah cuma kasih izin SELECT, tidak ada policy insert/update
-- sama sekali (biar nggak ada jalur nulis langsung dari client yang bypass
-- validasi kepemilikan/isi tiket).

-- ============================================================
-- 1) Tabel
-- ============================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  status text not null default 'open', -- 'open' | 'closed'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  is_admin boolean not null default false,
  message text not null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2) RLS — select doang, semua tulis lewat RPC di bawah
-- ============================================================
alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;

drop policy if exists tickets_select_own_or_admin on public.tickets;
create policy tickets_select_own_or_admin on public.tickets
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists ticket_messages_select_own_or_admin on public.ticket_messages;
create policy ticket_messages_select_own_or_admin on public.ticket_messages
  for select using (
    exists (
      select 1 from public.tickets t
      where t.id = ticket_messages.ticket_id
        and (t.user_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================
-- 3) RPC customer
-- ============================================================
create or replace function public.create_ticket(p_subject text, p_message text)
returns tickets
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_ticket public.tickets;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if trim(p_subject) = '' or trim(p_message) = '' then
    raise exception 'invalid_input';
  end if;

  insert into public.tickets (user_id, subject, status)
  values (v_uid, p_subject, 'open')
  returning * into v_ticket;

  insert into public.ticket_messages (ticket_id, is_admin, message)
  values (v_ticket.id, false, p_message);

  return v_ticket;
end;
$function$;

-- Customer balas tiketnya sendiri — kalau tiketnya kebetulan udah 'closed',
-- otomatis kebuka lagi (masuk akal: dia masih ada masalah, ngapain manual
-- buka lagi status-nya).
create or replace function public.reply_ticket(p_ticket_id uuid, p_message text)
returns ticket_messages
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_row public.ticket_messages;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if trim(p_message) = '' then
    raise exception 'invalid_input';
  end if;

  select user_id into v_owner from public.tickets where id = p_ticket_id for update;
  if v_owner is null then
    raise exception 'ticket_not_found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not_owner';
  end if;

  insert into public.ticket_messages (ticket_id, is_admin, message)
  values (p_ticket_id, false, p_message)
  returning * into v_row;

  update public.tickets set status = 'open', updated_at = now() where id = p_ticket_id;

  return v_row;
end;
$function$;

create or replace function public.close_ticket_own(p_ticket_id uuid)
returns tickets
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_ticket public.tickets;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  update public.tickets
  set status = 'closed', updated_at = now()
  where id = p_ticket_id and user_id = v_uid
  returning * into v_ticket;

  if v_ticket is null then
    raise exception 'ticket_not_found';
  end if;

  return v_ticket;
end;
$function$;

-- ============================================================
-- 4) RPC admin
-- ============================================================
create or replace function public.admin_reply_ticket(p_ticket_id uuid, p_message text)
returns ticket_messages
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_row public.ticket_messages;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if trim(p_message) = '' then
    raise exception 'invalid_input';
  end if;
  if not exists (select 1 from public.tickets where id = p_ticket_id) then
    raise exception 'ticket_not_found';
  end if;

  insert into public.ticket_messages (ticket_id, is_admin, message)
  values (p_ticket_id, true, p_message)
  returning * into v_row;

  update public.tickets set updated_at = now() where id = p_ticket_id;

  return v_row;
end;
$function$;

create or replace function public.admin_set_ticket_status(p_ticket_id uuid, p_status text)
returns tickets
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_ticket public.tickets;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if p_status not in ('open', 'closed') then
    raise exception 'invalid_status';
  end if;

  update public.tickets
  set status = p_status, updated_at = now()
  where id = p_ticket_id
  returning * into v_ticket;

  if v_ticket is null then
    raise exception 'ticket_not_found';
  end if;

  return v_ticket;
end;
$function$;
