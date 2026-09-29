-- Ganti perilaku reply_ticket: SEBELUMNYA customer balas ke tiket yang sudah
-- 'closed' otomatis membuka lagi tiketnya. Sekarang TIDAK BOLEH -- tiket yang
-- sudah ditutup admin harus tetap tertutup; kalau customer masih ada kendala,
-- diarahkan bikin tiket baru (lihat TiketView.tsx). Jalankan SEKALI di
-- Supabase SQL Editor.
create or replace function public.reply_ticket(p_ticket_id uuid, p_message text, p_attachment_path text default null)
returns ticket_messages
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_ticket public.tickets;
  v_row public.ticket_messages;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if trim(coalesce(p_message, '')) = '' and p_attachment_path is null then
    raise exception 'invalid_input';
  end if;

  select * into v_ticket from public.tickets where id = p_ticket_id for update;
  if v_ticket.id is null then
    raise exception 'ticket_not_found';
  end if;
  if v_ticket.user_id <> v_uid then
    raise exception 'not_owner';
  end if;
  if v_ticket.status = 'closed' then
    raise exception 'ticket_closed';
  end if;

  insert into public.ticket_messages (ticket_id, is_admin, message, attachment_path)
  values (p_ticket_id, false, coalesce(p_message, ''), p_attachment_path)
  returning * into v_row;

  update public.tickets set updated_at = now() where id = p_ticket_id;

  return v_row;
end;
$function$;
