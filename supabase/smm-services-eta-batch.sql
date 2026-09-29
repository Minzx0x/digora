-- Versi "banyak sekaligus" dari get_smm_service_eta (yang sudah ada, 1
-- service_id per panggilan) -- dibutuhkan buat kolom "Estimasi" di tabel
-- /dashboard/daftar-layanan, yang nampilin sampai 50 layanan per halaman.
-- Manggil get_smm_service_eta 50x per buka halaman kemahalan (50 round-trip
-- ke Supabase) -- fungsi ini 1 query buat sekaligus banyak service_id.
--
-- SAMA PERSIS cara ngitungnya dengan get_smm_service_eta (rata-rata
-- created_at -> completed_at dari SEMUA pesanan yang sudah 'ok', LINTAS
-- SEMUA pembeli, bukan cuma satu orang -- kalau 3 orang beda beli layanan
-- yang sama dan pesanannya selesai, ketiganya ikut kehitung di rata-rata &
-- sample_size layanan itu). Jalankan SEKALI di Supabase SQL Editor.
create or replace function public.get_smm_services_eta(p_service_ids uuid[])
returns table(service_id uuid, avg_minutes numeric, sample_size int)
language sql
security definer
set search_path to 'public'
as $$
  select
    o.service_id,
    avg(extract(epoch from (o.completed_at - o.created_at)) / 60)::numeric,
    count(*)::int
  from public.orders o
  where o.service_id = any(p_service_ids)
    and o.status = 'ok'
    and o.completed_at is not null
  group by o.service_id;
$$;
