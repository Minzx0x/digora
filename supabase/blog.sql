-- Fitur Blog: admin nulis/edit artikel dari /admin/blog, publik baca di
-- /blog & /blog/[slug]. Jalankan SEKALI di Supabase Dashboard -> SQL Editor.
--
-- Semua tulis (insert/update/delete) langsung lewat tabel (bukan RPC) --
-- cukup aman karena RLS "for all using (is_admin())" sudah nutup semuanya
-- buat non-admin, sama pola dengan smm_services_write_admin.

-- ============================================================
-- 1) Tabel
-- ============================================================
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content text not null default '', -- markdown
  cover_image_url text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2) RLS -- publik cuma bisa baca yang sudah published, admin bisa
--    baca+tulis semuanya (termasuk draft, buat preview sebelum publish).
-- ============================================================
alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_select on public.blog_posts;
create policy blog_posts_select on public.blog_posts
  for select using (published = true or public.is_admin());

drop policy if exists blog_posts_write_admin on public.blog_posts;
create policy blog_posts_write_admin on public.blog_posts
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- 3) Storage bucket buat gambar sampul -- PUBLIC (perlu tampil instan di
--    kartu /blog tanpa signed URL), tulis dibatasi admin doang. Nama file
--    selalu UUID acak (bukan ikut ID artikel) -- artikel baru belum punya
--    ID pas gambarnya diupload duluan.
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-covers', 'blog-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists blog_covers_write_admin on storage.objects;
create policy blog_covers_write_admin on storage.objects
  for all
  using (bucket_id = 'blog-covers' and public.is_admin())
  with check (bucket_id = 'blog-covers' and public.is_admin());

drop policy if exists blog_covers_select_public on storage.objects;
create policy blog_covers_select_public on storage.objects
  for select
  using (bucket_id = 'blog-covers');

-- ============================================================
-- 4) updated_at otomatis ke-update, TAPI cuma kalau kolom yang beneran
--    "konten" yang berubah (title/slug/excerpt/content/cover/published) --
--    SENGAJA ngecualiin view_count, soalnya update counter "dilihat" (bagian
--    5 di bawah) juga lewat UPDATE ke baris yang sama. Tanpa pengecualian
--    ini, "Diubah X lalu" di /admin/blog bakal keikut maju tiap kali ada
--    pengunjung buka artikelnya -- padahal admin nggak ngedit apa-apa.
-- ============================================================
create or replace function public.touch_blog_post_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $$
begin
  if (new.title, new.slug, new.excerpt, new.content, new.cover_image_url, new.published)
     is distinct from
     (old.title, old.slug, old.excerpt, old.content, old.cover_image_url, old.published) then
    new.updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_touch_blog_post_updated_at on public.blog_posts;
create trigger trg_touch_blog_post_updated_at
  before update on public.blog_posts
  for each row execute function public.touch_blog_post_updated_at();

-- ============================================================
-- 5) Jumlah dilihat -- counter sederhana (bukan unique visitor), nambah tiap
--    kali halaman /blog/[slug] dibuka. RPC-nya SECURITY DEFINER karena yang
--    manggil pengunjung anon biasa (belum login), yang RLS-nya cuma boleh
--    SELECT, bukan UPDATE -- cuma nambah ke artikel yang published (preview
--    draf oleh admin sengaja TIDAK ikut kehitung).
-- ============================================================
alter table public.blog_posts add column if not exists view_count bigint not null default 0;

create or replace function public.increment_blog_view(p_slug text)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.blog_posts set view_count = view_count + 1 where slug = p_slug and published = true;
$$;
