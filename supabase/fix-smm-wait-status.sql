-- Koreksi order SMM yang kena bug mapSmmflareStatus salah petain "pending"
-- (order masih antre di smmflare) ke status "wait" (Menunggu bayar) --
-- padahal order SMM SELALU sudah dibayar duluan (saldo kepotong sinkron)
-- sebelum diteruskan ke smmflare, jadi "wait" nggak pernah valid buat order
-- SMM. Balikin ke 'proc' (Diproses) -- UPDATE LANGSUNG (bukan lewat RPC),
-- soalnya transisi wait->proc TIDAK ada efek saldo (beda dari transisi yang
-- melibatkan 'fail'), jadi aman langsung di-update kolomnya doang.
-- Jalankan SEKALI di Supabase SQL Editor.
update public.orders
set status = 'proc'
where kind = 'smm' and status = 'wait';
