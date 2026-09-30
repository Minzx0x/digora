-- Kategori/Subkategori/Order ID di form bikin tiket baru — biar admin
-- langsung tau konteks tiketnya tanpa customer harus jelasin ulang di pesan.
-- Jalankan SEKALI di Supabase Dashboard -> SQL Editor, SETELAH tickets.sql.

-- ============================================================
-- 1) Kolom baru — nullable, subject tetap wajib (masih dipakai buat judul
--    list/thread), field-field ini cuma metadata tambahan.
-- ============================================================
alter table public.tickets add column if not exists category text;
alter table public.tickets add column if not exists subcategory text;
alter table public.tickets add column if not exists order_id text;

-- ============================================================
-- 2) RPC — tambah parameter trailing dengan default null, jadi create-or-
--    replace di signature yang sama (bukan overload baru), sama pola dengan
--    ticket-attachments.sql.
-- ============================================================
create or replace function public.create_ticket(
  p_subject text,
  p_message text,
  p_category text default null,
  p_subcategory text default null,
  p_order_id text default null
)
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

  insert into public.tickets (user_id, subject, status, category, subcategory, order_id)
  values (
    v_uid,
    p_subject,
    'open',
    nullif(trim(coalesce(p_category, '')), ''),
    nullif(trim(coalesce(p_subcategory, '')), ''),
    nullif(trim(coalesce(p_order_id, '')), '')
  )
  returning * into v_ticket;

  insert into public.ticket_messages (ticket_id, is_admin, message)
  values (v_ticket.id, false, p_message);

  return v_ticket;
end;
$function$;
