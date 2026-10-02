-- Fitur "Ajak Teman": tiap akun otomatis punya kode referral sendiri. Orang
-- baru daftar pakai kode itu (link /daftar?ref=KODE), dan begitu temannya
-- top up saldo untuk PERTAMA KALI, yang NGAJAK dapat komisi persentase dari
-- nominal deposit itu (dikunci ke nominal maksimal) -- yang diajak sendiri
-- TIDAK dapat bonus tambahan apa pun, cuma akses normal.
-- Jalankan SEKALI di Supabase Dashboard -> SQL Editor.

alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by uuid references public.profiles(id);
-- Dicentang begitu komisi referral buat deposit pertama akun ini sudah
-- dibayar sekali -- mencegah komisi dobel kalau nanti ada lebih dari satu
-- deposit "pertama".
alter table public.profiles add column if not exists referral_reward_given boolean not null default false;

-- Ganti dari model nominal flat ke model komisi persentase (10% dari deposit
-- pertama teman yang diajak), TAPI dikunci ke nominal maksimal per referral
-- (referral_bonus_cap) -- tanpa batas ini, makin gede nominal "deposit",
-- makin gede juga untungnya buat yang akal-akalan bikin akun kembar sendiri.
-- Cap-nya SENGAJA dipasang kecil (~Rp1.500, bukan puluhan ribu) -- begitu
-- komisi kepentok cap, nominalnya jadi rata (flat) berapa pun deposit-nya,
-- padahal fee e-wallet/bank transfer JUGA flat (Rp1.500/Rp3.000) dan nggak
-- ikut naik kayak fee QRIS yang proporsional. Kalau cap-nya lebih gede dari
-- fee flat termurah, orang tinggal top up sekali di atas titik cap pakai
-- e-wallet buat dapat untung bersih tiap siklus -- dengan cap sekecil ini,
-- fee-nya selalu lebih besar/sama dengan komisi, jadi nggak ada untungnya.
alter table public.app_settings add column if not exists referral_bonus_percent numeric not null default 10;
alter table public.app_settings add column if not exists referral_bonus_cap bigint not null default 1500;
alter table public.app_settings drop column if exists referral_bonus_referrer;
alter table public.app_settings drop column if exists referral_bonus_referred;

-- Kode 6 karakter, huruf besar+angka, tanpa karakter yang gampang kebalik
-- (0/O, 1/I) biar nyaman diketik manual. Diulang kalau pas bentrok sama kode
-- yang sudah ada (kemungkinannya kecil, tapi dicek biar aman).
create or replace function public.generate_referral_code()
returns text
language plpgsql
set search_path to 'public'
as $function$
declare
  v_alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
begin
  loop
    v_code := '';
    for i in 1..6 loop
      v_code := v_code || substr(v_alphabet, floor(random() * length(v_alphabet) + 1)::int, 1);
    end loop;
    if not exists (select 1 from public.profiles where referral_code = v_code) then
      return v_code;
    end if;
  end loop;
end;
$function$;

create or replace function public.set_profile_referral_code()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_set_referral_code on public.profiles;
create trigger profiles_set_referral_code
  before insert on public.profiles
  for each row execute function public.set_profile_referral_code();

-- Backfill akun yang sudah ada dari sebelum fitur ini dibuat.
update public.profiles set referral_code = public.generate_referral_code() where referral_code is null;

create unique index if not exists profiles_referral_code_idx on public.profiles (referral_code);

-- Dipanggil sendiri oleh user yang baru daftar (lewat form daftar yang ada
-- field "Kode referral (opsional)"). Cuma bisa dipanggil SEKALI per akun, dan
-- cuma kalau akun itu belum pernah topup sukses sama sekali -- supaya nggak
-- ada yang topup dulu baru nempel-nempelin kode referral belakangan buat
-- mancing komisi buat orang lain.
create or replace function public.apply_referral_code(p_code text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_referrer_id uuid;
  v_current_referred_by uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select referred_by into v_current_referred_by from public.profiles where id = v_uid;
  if v_current_referred_by is not null then
    raise exception 'already_set';
  end if;

  if exists (select 1 from public.deposits where user_id = v_uid and status = 'paid') then
    raise exception 'already_deposited';
  end if;

  select id into v_referrer_id from public.profiles where referral_code = upper(trim(p_code));
  if v_referrer_id is null then
    raise exception 'invalid_code';
  end if;
  if v_referrer_id = v_uid then
    raise exception 'self_referral';
  end if;

  update public.profiles set referred_by = v_referrer_id where id = v_uid;
end;
$function$;

-- Dipanggil dari halaman "Ajak Teman" di dashboard buat nampilin kode milik
-- sendiri, berapa teman yang sudah diajak, dan total komisi yang sudah
-- didapat dari program ini.
-- Drop dulu -- CREATE OR REPLACE nggak bisa dipakai buat ganti tipe kolom
-- hasil fungsi (di versi lama returns-nya bonus_referrer/bonus_referred,
-- sekarang bonus_percent/bonus_cap), Postgres nolak kalau nggak di-drop dulu.
drop function if exists public.get_my_referral_stats();
create or replace function public.get_my_referral_stats()
returns table(
  referral_code text,
  referred_count bigint,
  total_earned bigint,
  bonus_percent numeric,
  bonus_cap bigint
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  return query
    select
      p.referral_code,
      (select count(*) from public.profiles r where r.referred_by = v_uid),
      coalesce(
        (select sum(m.amount)::bigint from public.saldo_mutations m
          where m.user_id = v_uid and m.description = 'Komisi referral: temanmu top up pertama kali'),
        0
      ),
      s.referral_bonus_percent,
      s.referral_bonus_cap
    from public.profiles p, public.app_settings s
    where p.id = v_uid and s.id = true;
end;
$function$;

-- ============================================================
-- mark_deposit_paid -- create or replace ULANG versi yang sudah ada di
-- supabase/fix-deposit-rpc-security.sql, cuma NAMBAH blok komisi referral di
-- akhir (sebelum return). Semua pengecekan keamanan yang sudah ada (cuma
-- boleh dipanggil service_role, idempoten kalau dipanggil dobel buat
-- reference_id yang sama) TETAP, tidak diubah.
-- ============================================================
create or replace function public.mark_deposit_paid(p_reference_id text, p_paymenku_trx_id text default '')
returns deposits
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_dep public.deposits;
  v_referred_by uuid;
  v_reward_given boolean;
  v_bonus_percent numeric;
  v_bonus_cap bigint;
  v_commission bigint;
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

  -- Komisi referral: cuma dikasih sekali, pas deposit SUKSES pertama akun
  -- yang diajak (bukan tiap deposit) -- dijaga lewat kolom
  -- referral_reward_given. "for update" DI SINI PENTING: kalau user punya 2
  -- deposit yang kebetulan dikonfirmasi webhook nyaris bersamaan, tanpa lock
  -- ini kedua transaksi bisa sama-sama baca referral_reward_given=false
  -- SEBELUM salah satu sempat commit, dan komisi kebayar dobel. Lock ini
  -- bikin transaksi kedua nunggu sampai yang pertama commit, baru baca ulang
  -- (sudah true).
  select referred_by, referral_reward_given into v_referred_by, v_reward_given
  from public.profiles where id = v_dep.user_id for update;

  if v_referred_by is not null and not v_reward_given then
    select referral_bonus_percent, referral_bonus_cap into v_bonus_percent, v_bonus_cap
    from public.app_settings where id = true;

    v_commission := least(floor(v_dep.amount * v_bonus_percent / 100.0), v_bonus_cap)::bigint;

    update public.profiles set referral_reward_given = true where id = v_dep.user_id;

    if v_commission > 0 then
      update public.profiles set saldo = saldo + v_commission where id = v_referred_by;
      insert into public.saldo_mutations (user_id, description, amount)
      values (v_referred_by, 'Komisi referral: temanmu top up pertama kali', v_commission);
    end if;
  end if;

  return v_dep;
end;
$function$;
