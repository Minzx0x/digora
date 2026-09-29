-- KRITIS: Supabase security linter nemuin mark_deposit_paid & mark_deposit_failed
-- SAMA SEKALI TIDAK ADA pengecekan siapa yang manggil -- siapa pun (bahkan
-- yang belum login) bisa panggil langsung lewat /rest/v1/rpc/mark_deposit_paid
-- pakai reference_id tebakan/hasil intip punya sendiri, dan LANGSUNG dapet
-- saldo gratis tanpa beneran bayar lewat Paymenku sama sekali. Kedua fungsi
-- ini SEHARUSNYA cuma boleh dipanggil dari webhook Paymenku
-- (app/api/webhooks/paymenku/route.ts, yang sudah verifikasi signature dulu
-- SEBELUM manggil RPC ini, pakai service-role client) -- bukan dari sesi
-- customer/anon biasa.
--
-- deposit_saldo malah lebih parah lagi: user yang LOGIN bisa panggil langsung
-- dengan jumlah SEMBARANG dan saldo-nya nambah instan tanpa bayar apa-apa --
-- dan fungsi ini TIDAK dipanggil di manapun oleh kode aplikasi (sudah dicek,
-- nggak ada satupun referensi "deposit_saldo" di seluruh codebase), jadi ini
-- cuma pintu belakang mati yang kebuka, bukan fitur yang beneran dipakai.
--
-- Jalankan SEKALI di Supabase SQL Editor SEGERA.

-- ============================================================
-- 1) mark_deposit_paid -- dikunci ke service_role doang (sama pola dengan
--    system_update_order_status yang sudah ada).
-- ============================================================
create or replace function public.mark_deposit_paid(p_reference_id text, p_paymenku_trx_id text default '')
returns deposits
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dep public.deposits;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not_service_role';
  end if;

  select * into v_dep from public.deposits where reference_id = p_reference_id for update;
  if v_dep.id is null then
    raise exception 'deposit_not_found';
  end if;

  if v_dep.status = 'paid' then
    return v_dep; -- sudah pernah diproses, jangan tambah saldo lagi
  end if;

  update public.deposits
  set status = 'paid',
      paid_at = now(),
      paymenku_trx_id = coalesce(nullif(p_paymenku_trx_id, ''), paymenku_trx_id)
  where id = v_dep.id
  returning * into v_dep;

  update public.profiles set saldo = saldo + v_dep.amount where id = v_dep.user_id;

  insert into public.saldo_mutations (user_id, description, amount)
  values (v_dep.user_id, 'Isi saldo via Paymenku (' || v_dep.method || ')', v_dep.amount);

  return v_dep;
end;
$function$;

-- ============================================================
-- 2) mark_deposit_failed -- sama, dikunci ke service_role.
-- ============================================================
create or replace function public.mark_deposit_failed(p_reference_id text)
returns deposits
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dep public.deposits;
begin
  if auth.role() <> 'service_role' then
    raise exception 'not_service_role';
  end if;

  update public.deposits
  set status = 'failed'
  where reference_id = p_reference_id and status = 'pending'
  returning * into v_dep;

  if v_dep.id is null then
    select * into v_dep from public.deposits where reference_id = p_reference_id;
  end if;
  if v_dep.id is null then
    raise exception 'deposit_not_found';
  end if;

  return v_dep;
end;
$function$;

-- ============================================================
-- 3) deposit_saldo -- DIHAPUS. Tidak dipakai di manapun oleh kode aplikasi,
--    dan biarin fungsi ini tetap ada = pintu belakang "kasih saldo gratis ke
--    diri sendiri" yang kebuka buat SIAPAPUN yang login.
-- ============================================================
drop function if exists public.deposit_saldo(bigint, text);

-- ============================================================
-- 4) Hardening murah, bukan yang kritis: 2 trigger function ini nggak punya
--    search_path tetap (linter nandain sebagai "mutable search_path"). Nggak
--    bisa dieksploitasi langsung (cuma hitung angka dari kolom NEW, nggak
--    query tabel lain), tapi gratis buat dibenerin sekalian.
-- ============================================================
create or replace function public.recalc_package_price()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.price := round(new.cost_price * (1 + new.margin_percent / 100.0));
  return new;
end;
$function$;

create or replace function public.recalc_smm_service_price()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.price_per_1000 := round(new.cost_price_per_1000 * (1 + new.margin_percent / 100));
  return new;
end;
$function$;

-- ============================================================
-- 5) handle_new_user & protect_profile_role cuma trigger function (RETURNS
--    trigger) -- SECARA PRAKTIK nggak bisa dipanggil langsung lewat RPC biasa
--    (Postgres nolak trigger function dipanggil di luar konteks trigger),
--    jadi bukan bug yang beneran bisa dieksploitasi walau linter nandain.
--    EXECUTE dicabut dari anon/authenticated di sini cuma buat nutup
--    warning-nya di linter, bukan nutup celah beneran (celahnya emang nggak
--    ada dari awal).
-- ============================================================
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.protect_profile_role() from anon, authenticated;
