-- Perbaikan bug: admin_update_order_status cuma nge-refund pas status BARU
-- masuk ke 'fail', tapi TIDAK pernah menarik balik saldo itu kalau order yang
-- tadinya 'fail' diubah lagi ke status lain (mis. 'ok'). Akibatnya order yang
-- sempat digagalkan (direfund) lalu ke-ubah balik jadi Selesai, pembelinya
-- pegang saldo refund itu SEKALIGUS pesanan dianggap selesai -- dobel untung.
-- Jalankan SEKALI di Supabase SQL Editor.

-- ============================================================
-- 1) Redefinisi admin_update_order_status -- simetris sekarang: masuk ke
--    'fail' = refund, KELUAR dari 'fail' ke status lain = tarik balik refund
--    itu. Sisanya (cek is_admin, catat fail_reason/completed_at) tidak berubah.
-- ============================================================
create or replace function public.admin_update_order_status(p_order_id uuid, p_status text, p_reason text default '')
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_old_status text;
  v_order public.orders;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

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
-- 2) Koreksi manual DG-10402 -- Stars memang GAGAL terkirim ke @zima0x.
--    KOREKSI dari draft sebelumnya: order ini TERNYATA BELUM PERNAH direfund
--    sama sekali -- status 'fail' sebelumnya bukan hasil dari fungsi
--    admin_update_order_status (makanya di UI tombol "Tandai gagal" juga
--    sudah hilang begitu status-nya 'fail', tidak ada transisi lagi yang bisa
--    memicu refund). Blok ini idempotent (aman dijalankan berkali-kali,
--    termasuk kalau versi draft SEBELUMNYA sempat dijalankan): mastiin order
--    ini status-nya 'fail' DAN sudah tercatat direfund PERSIS SEKALI.
-- ============================================================
do $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where order_code = 'DG-10402' for update;
  if v_order.id is null then
    raise notice 'Order DG-10402 tidak ditemukan, dilewati.';
    return;
  end if;

  update public.orders
  set status = 'fail',
      fail_reason = 'Pesanan gagal terkirim (dikoreksi manual oleh admin).'
  where id = v_order.id;

  if not exists (
    select 1 from public.saldo_mutations
    where user_id = v_order.user_id
      and description like 'Refund pesanan gagal (' || v_order.order_code || ')%'
  ) then
    update public.profiles set saldo = saldo + v_order.total where id = v_order.user_id;
    insert into public.saldo_mutations (user_id, description, amount)
    values (v_order.user_id, 'Refund pesanan gagal (' || v_order.order_code || ') oleh admin — koreksi manual', v_order.total);
  end if;
end $$;
