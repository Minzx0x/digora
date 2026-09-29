-- Lampiran foto di Tiket Support. Jalankan SEKALI di Supabase Dashboard ->
-- SQL Editor, SETELAH tickets.sql (yang sudah pernah dijalankan sebelumnya).
--
-- Bucket dibuat PRIVAT (bukan public) — baca file harus lewat signed URL yang
-- di-generate di server, biar konsisten dengan RLS tabel tickets/ticket_messages
-- yang juga cuma bisa dibaca pemilik tiket atau admin.

-- ============================================================
-- 1) Kolom baru
-- ============================================================
alter table public.ticket_messages add column if not exists attachment_path text;

-- ============================================================
-- 2) Storage bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ticket-attachments', 'ticket-attachments', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Path file selalu "{ticket_id}/{uuid}.{ext}" — segmen folder pertama =
-- ticket_id, dipakai policy di bawah buat cek kepemilikan, sama persis pola
-- ticket_messages_select_own_or_admin (join balik ke tabel tickets).
drop policy if exists ticket_attachments_insert on storage.objects;
create policy ticket_attachments_insert on storage.objects
  for insert
  with check (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (t.user_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists ticket_attachments_select on storage.objects;
create policy ticket_attachments_select on storage.objects
  for select
  using (
    bucket_id = 'ticket-attachments'
    and exists (
      select 1 from public.tickets t
      where t.id::text = (storage.foldername(name))[1]
        and (t.user_id = auth.uid() or public.is_admin())
    )
  );

-- ============================================================
-- 3) RPC — tambah parameter p_attachment_path (trailing, ada default,
--    jadi create-or-replace di signature yang sama, bukan overload baru)
-- ============================================================
create or replace function public.reply_ticket(p_ticket_id uuid, p_message text, p_attachment_path text default null)
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
  if trim(coalesce(p_message, '')) = '' and p_attachment_path is null then
    raise exception 'invalid_input';
  end if;

  select user_id into v_owner from public.tickets where id = p_ticket_id for update;
  if v_owner is null then
    raise exception 'ticket_not_found';
  end if;
  if v_owner <> v_uid then
    raise exception 'not_owner';
  end if;

  insert into public.ticket_messages (ticket_id, is_admin, message, attachment_path)
  values (p_ticket_id, false, coalesce(p_message, ''), p_attachment_path)
  returning * into v_row;

  update public.tickets set status = 'open', updated_at = now() where id = p_ticket_id;

  return v_row;
end;
$function$;

create or replace function public.admin_reply_ticket(p_ticket_id uuid, p_message text, p_attachment_path text default null)
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
  if trim(coalesce(p_message, '')) = '' and p_attachment_path is null then
    raise exception 'invalid_input';
  end if;
  if not exists (select 1 from public.tickets where id = p_ticket_id) then
    raise exception 'ticket_not_found';
  end if;

  insert into public.ticket_messages (ticket_id, is_admin, message, attachment_path)
  values (p_ticket_id, true, coalesce(p_message, ''), p_attachment_path)
  returning * into v_row;

  update public.tickets set updated_at = now() where id = p_ticket_id;

  return v_row;
end;
$function$;
