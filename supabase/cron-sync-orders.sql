-- Sinkronisasi status pesanan otomatis (dipanggil dari cron job eksternal
-- lewat app/api/cron/sync-orders/route.ts, bukan dari dashboard admin) --
-- sebelum ini status order yang masih "Diproses" CUMA berubah kalau admin
-- klik tombol "Cek smmflare"/"Cek RSC" manual satu-satu; sekarang bisa
-- di-refresh otomatis berkala. Jalankan SEKALI di Supabase SQL Editor.
--
-- admin_update_order_status yang lama TIDAK dihapus/diganti perilakunya --
-- logic UPDATE + refund-nya cuma dipindah ke fungsi internal
-- _apply_order_status supaya bisa dipakai bareng oleh 2 gerbang izin beda:
-- admin manual (cek is_admin()) dan proses otomatis (cek service_role).

-- ============================================================
-- 1) Fungsi internal -- BUKAN buat dipanggil langsung dari client, nggak ada
--    pengecekan izin sendiri (izinnya dicek di 2 pembungkus di bawah).
-- ============================================================
create or replace function public._apply_order_status(p_order_id uuid, p_status text, p_reason text)
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_old_status text;
  v_order public.orders;
begin
  select status into v_old_status from public.orders where id = p_order_id for update;
  if v_old_status is null then
    raise exception 'order_not_found';
  end if;

  update public.orders
  set status = p_status,
      fail_reason = case when p_status = 'fail' then p_reason else fail_reason end,
      completed_at = case when p_status = 'ok' and completed_at is null then now() else completed_at end
  where id = p_order_id
  returning * into v_order;

  if v_old_status is distinct from 'fail' and v_order.status = 'fail' then
    update public.profiles set saldo = saldo + v_order.total where id = v_order.user_id;
    insert into public.saldo_mutations (user_id, description, amount)
    values (v_order.user_id, 'Refund pesanan gagal (' || v_order.order_code || ') oleh admin', v_order.total);
  elsif v_old_status = 'fail' and v_order.status is distinct from 'fail' then
    update public.profiles set saldo = saldo - v_order.total where id = v_order.user_id;
    insert into public.saldo_mutations (user_id, description, amount)
    values (v_order.user_id, 'Tarik kembali refund (' || v_order.order_code || ') karena status diubah dari Gagal oleh admin', -v_order.total);
  end if;

  return v_order;
end;
$function$;

-- ============================================================
-- 2) admin_update_order_status -- REDEFINISI, perilaku dari luar SAMA PERSIS
--    (masih cek is_admin(), masih refund simetris), cuma sekarang delegasi
--    ke _apply_order_status di atas biar logic-nya nggak keduplikat.
-- ============================================================
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text, p_reason text default '')
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  return public._apply_order_status(p_order_id, p_status, p_reason);
end;
$function$;

-- ============================================================
-- 3) system_update_order_status -- BARU, khusus dipanggil dari cron job pakai
--    Supabase service_role key (lihat lib/supabase/service.ts) -- BUKAN buat
--    dipanggil dari sesi customer/admin biasa (auth.role() bakal 'authenticated'
--    di situ, bukan 'service_role', jadi ketolak).
-- ============================================================
create or replace function public.system_update_order_status(p_order_id uuid, p_status text, p_reason text default '')
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if auth.role() <> 'service_role' then
    raise exception 'not_service_role';
  end if;
  return public._apply_order_status(p_order_id, p_status, p_reason);
end;
$function$;
