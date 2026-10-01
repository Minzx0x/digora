-- RPC buat "Simpan semua" di /admin/smm — update Modal/Markup BANYAK layanan
-- sekaligus dalam SATU request/transaksi, bukan 1 request per baris (katalog
-- bisa sampai ribuan baris, lihat "Tarik semua layanan smmflare").
--
-- Kenapa bukan upsert biasa (sempat dicoba lalu dibatalkan): smm_services
-- punya beberapa kolom NOT NULL tanpa default (provider_service_id, category,
-- name, min_quantity, max_quantity) dan beberapa kolom NOT NULL BER-default
-- (active, sort_order, refill, dripfeed) -- upsert yang cuma ngirim
-- {id, cost_price_per_1000, margin_percent} gagal kena constraint NOT NULL di
-- kolom tanpa default, dan kalaupun itu di-isi, kolom ber-default (terutama
-- "active") bakal ke-reset diam-diam ke default-nya tiap kali harga disimpan
-- -- bug yang lebih parah dari errornya sendiri. UPDATE biasa per id (di
-- dalam RPC, bukan upsert) aman karena cuma nyentuh 2 kolom yang memang mau
-- diubah, kolom lain nggak kesentuh sama sekali.
--
-- Jalankan SEKALI di Supabase Dashboard -> SQL Editor.
create or replace function public.admin_bulk_update_smm_margin(p_updates jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_item jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  for v_item in select * from jsonb_array_elements(p_updates)
  loop
    update public.smm_services
    set cost_price_per_1000 = (v_item->>'cost_price_per_1000')::bigint,
        margin_percent = (v_item->>'margin_percent')::numeric
    where id = (v_item->>'id')::uuid;
  end loop;
end;
$function$;

-- Aktifkan/nonaktifkan BANYAK layanan sekaligus dalam satu request -- dipakai
-- tombol "Aktifkan semua" di /admin/smm, sama alasannya dengan
-- admin_bulk_update_smm_margin di atas (hindari ribuan request satu-satu).
-- Semua baris diset ke nilai p_active yang SAMA, jadi cukup satu UPDATE ...
-- WHERE id = ANY(...), nggak perlu loop per baris kayak RPC margin di atas.
create or replace function public.admin_bulk_set_smm_active(p_ids uuid[], p_active boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;

  update public.smm_services
  set active = p_active
  where id = any(p_ids);
end;
$function$;
