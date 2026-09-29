-- BUG SERIUS: tabel orders punya CHECK CONSTRAINT "orders_kind_check" yang
-- kelihatannya cuma ngizinin kind 'stars'/'premium' -- pas fitur SMM Panel
-- dibikin (kind='smm'), constraint ini KELUPAAN diupdate. Akibatnya SETIAP
-- percobaan beli SMM Panel gagal di level database (error code 23514,
-- check_violation), nggak peduli layanan/jumlah/link-nya apa. Saldo TIDAK
-- kepotong kalau ini kejadian (insert order-nya gagal duluan sebelum
-- transaksi commit), tapi customer kelihat pesan "Gagal memproses" generik
-- tanpa tau kenapa.
--
-- Jalankan SEKALI di Supabase SQL Editor.
alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check check (kind in ('stars', 'premium', 'smm'));
