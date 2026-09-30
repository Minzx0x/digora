-- Foto profil user + total belanja lifetime (buat tier). Jalankan SEKALI di
-- Supabase Dashboard -> SQL Editor.
--
-- Bucket dibuat PUBLIC (beda dari ticket-attachments yang privat) -- foto
-- profil bukan data sensitif dan perlu tampil instan di sidebar/kartu profil
-- tanpa harus generate signed URL tiap render.

-- ============================================================
-- 1) Kolom baru
-- ============================================================
alter table public.profiles add column if not exists avatar_url text;

-- ============================================================
-- 2) Storage bucket
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Path selalu "{user_id}/avatar.{ext}" -- segmen folder pertama = pemilik,
-- dipakai policy di bawah biar user cuma bisa nulis/timpa foto folder sendiri.
-- Baca tetap public (siapapun boleh GET) -- itulah gunanya bucket public.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_select_public on storage.objects;
create policy avatars_select_public on storage.objects
  for select
  using (bucket_id = 'avatars');

-- ============================================================
-- 3) RPC total belanja sukses lifetime (buat tier di halaman Profil) --
--    selalu ngitung punya diri sendiri (auth.uid()), TIDAK nerima
--    parameter user_id, jadi aman dipanggil user biasa tanpa bisa
--    ngintip total belanja user lain.
-- ============================================================
create or replace function public.my_completed_spend()
returns numeric
language sql
security definer
set search_path = 'public'
stable
as $$
  select coalesce(sum(total), 0) from public.orders where user_id = auth.uid() and status = 'ok';
$$;
