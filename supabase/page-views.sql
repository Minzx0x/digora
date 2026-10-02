-- Analytics super-sederhana numpang Supabase sendiri (bukan Google
-- Analytics/dkk) -- nggak butuh akun/ID/env var dari luar sama sekali.
-- Cuma nyatet path halaman + waktu, dipakai admin buat liat tren kunjungan
-- di /admin/statistik. Jalankan SEKALI di Supabase Dashboard -> SQL Editor.

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,
  created_at timestamptz not null default now()
);

-- Index biar query rentang tanggal (dipakai admin-stats.ts) cepat walau
-- baris udah banyak.
create index if not exists page_views_created_at_idx on public.page_views (created_at);

alter table public.page_views enable row level security;

-- Cuma admin yang boleh BACA (dipakai di /admin/statistik). Nggak ada policy
-- insert sama sekali -- nulis cuma lewat RPC record_page_view di bawah
-- (SECURITY DEFINER, nge-bypass RLS), jadi nggak ada jalur insert langsung
-- dari client yang bisa dipakai nyuntik data aneh-aneh ke tabel ini.
drop policy if exists page_views_select_admin on public.page_views;
create policy page_views_select_admin on public.page_views
  for select using (public.is_admin());

-- Dipanggil dari PageViewTracker.tsx tiap kali halaman dibuka (termasuk
-- pengunjung anon yang belum login) -- path dipotong max 500 karakter biar
-- nggak ada yang iseng ngirim string raksasa.
create or replace function public.record_page_view(p_path text)
returns void
language sql
security definer
set search_path to 'public'
as $$
  insert into public.page_views (path) values (left(p_path, 500));
$$;
