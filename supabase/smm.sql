-- Skema buat fitur SMM Panel (followers/likes/views via smmflare.com).
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor, di project yang sama
-- dengan tabel orders/packages/profiles yang sudah ada.
--
-- Order SMM sengaja numpang di tabel "orders" yang sama (bukan tabel baru) karena
-- orders ternyata tidak FK ke packages sama sekali -- cuma snapshot text/angka,
-- jadi order SMM tinggal butuh beberapa kolom generik tambahan. Konsekuensinya:
-- riwayat pesanan customer (Beranda/Riwayat) dan daftar pesanan admin (/admin/pesanan)
-- otomatis kegabung, tanpa perlu query kedua + merge manual di TypeScript.

-- ============================================================
-- 1) Kolom generik baru di orders (nullable/default, tidak breaking data lama)
-- ============================================================
alter table public.orders
  alter column target_username drop not null,
  add column if not exists target_link text,
  add column if not exists provider text not null default 'rsc',
  add column if not exists provider_order_id bigint,
  add column if not exists provider_status text not null default '',
  -- Dua kolom ini buat fitur "estimasi selesai dari riwayat pesanan asli" —
  -- service_id nyambungin order SMM ke layanannya (buat dikelompokkan),
  -- completed_at nyatet KAPAN status berubah jadi 'ok' (sebelumnya cuma
  -- created_at yang ada, jadi durasi prosesnya nggak pernah kehitung).
  -- Data lama TETAP NULL selamanya (nggak bisa diisi mundur, waktunya emang
  -- nggak pernah dicatat) -- estimasi baru mulai keisi dari order baru dan
  -- seterusnya setelah ini dijalankan.
  add column if not exists service_id uuid references public.smm_services(id),
  add column if not exists completed_at timestamptz;

-- ============================================================
-- 2) Katalog SMM -- kurasi manual (admin pilih satu-satu dari daftar live
--    smmflare, BUKAN sync massal -- providernya bisa punya ribuan layanan).
-- ============================================================
create table if not exists public.smm_services (
  id uuid primary key default gen_random_uuid(),
  provider_service_id bigint not null unique,
  category text not null,
  name text not null,
  cost_price_per_1000 bigint not null default 0,
  margin_percent numeric not null default 20,
  price_per_1000 bigint not null default 0,
  min_quantity integer not null,
  max_quantity integer not null,
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  -- Info tambahan dari smmflare (bukan buat harga, cuma ditampilin ke customer
  -- di kotak detail layanan) — ditambahkan belakangan, aman di-re-run karena
  -- IF NOT EXISTS.
  refill boolean not null default false,
  dripfeed boolean not null default false
);

alter table public.smm_services add column if not exists refill boolean not null default false;
alter table public.smm_services add column if not exists dripfeed boolean not null default false;

alter table public.smm_services enable row level security;

drop policy if exists smm_services_select_all on public.smm_services;
create policy smm_services_select_all on public.smm_services
  for select using (true);

drop policy if exists smm_services_write_admin on public.smm_services;
create policy smm_services_write_admin on public.smm_services
  for all using (public.is_admin()) with check (public.is_admin());

-- Harga jual (price_per_1000) dihitung otomatis dari modal x markup, sama pola
-- dengan packages.price -- TypeScript tidak pernah nulis price_per_1000 langsung.
create or replace function public.recalc_smm_service_price()
returns trigger
language plpgsql
as $$
begin
  new.price_per_1000 := round(new.cost_price_per_1000 * (1 + new.margin_percent / 100));
  return new;
end;
$$;

drop trigger if exists trg_recalc_smm_service_price on public.smm_services;
create trigger trg_recalc_smm_service_price
  before insert or update of cost_price_per_1000, margin_percent on public.smm_services
  for each row execute function public.recalc_smm_service_price();

-- ============================================================
-- 3) RPC beli SMM pakai saldo -- mirror buy_with_saldo persis (termasuk pakai
--    sequence order_code_seq yang sama, prefix "DG-" yang sama).
-- ============================================================
create or replace function public.buy_smm_with_saldo(p_service_id uuid, p_target_link text, p_quantity integer)
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_saldo bigint;
  v_service public.smm_services;
  v_total bigint;
  v_code text;
  v_order public.orders;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_service from public.smm_services where id = p_service_id and active for update;
  if v_service is null then
    raise exception 'service_not_found';
  end if;
  if p_quantity < v_service.min_quantity or p_quantity > v_service.max_quantity then
    raise exception 'invalid_amount';
  end if;

  v_total := round(v_service.price_per_1000 * p_quantity / 1000.0);

  select saldo into v_saldo from public.profiles where id = v_uid for update;
  if v_saldo is null then
    raise exception 'profile_not_found';
  end if;
  if v_saldo < v_total then
    raise exception 'insufficient_balance';
  end if;

  update public.profiles set saldo = saldo - v_total where id = v_uid;

  v_code := 'DG-' || nextval('public.order_code_seq');

  insert into public.orders (user_id, order_code, kind, package_label, units, total, status, target_link, provider, service_id)
  values (v_uid, v_code, 'smm', v_service.name, p_quantity, v_total, 'proc', p_target_link, 'smmflare', p_service_id)
  returning * into v_order;

  insert into public.saldo_mutations (user_id, description, amount)
  values (v_uid, 'Beli ' || v_service.name || ' (' || v_code || ')', -v_total);

  return v_order;
end;
$function$;

-- ============================================================
-- 4) RPC sinkron status abis order dikirim ke smmflare -- mirror
--    sync_order_from_rsc persis (customer-scoped, dipanggil sinkron abis
--    buy_smm_with_saldo di request yang sama), cuma ganti kolom rsc_* jadi
--    provider_order_id/provider_status yang baru.
-- ============================================================
create or replace function public.sync_smm_order_from_provider(
  p_order_id uuid,
  p_provider_order_id bigint,
  p_provider_status text,
  p_new_status text,
  p_reason text default ''
)
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_old_status text;
  v_order public.orders;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select status into v_old_status from public.orders where id = p_order_id and user_id = v_uid for update;
  if v_old_status is null then
    raise exception 'order_not_found';
  end if;

  update public.orders
  set provider_order_id = coalesce(p_provider_order_id, provider_order_id),
      provider_status = p_provider_status,
      fail_reason = case when p_new_status = 'fail' then p_reason else fail_reason end,
      status = p_new_status,
      completed_at = case when p_new_status = 'ok' and completed_at is null then now() else completed_at end
  where id = p_order_id
  returning * into v_order;

  if v_old_status is distinct from 'fail' and v_order.status = 'fail' then
    update public.profiles set saldo = saldo + v_order.total where id = v_uid;
    insert into public.saldo_mutations (user_id, description, amount)
    values (v_uid, 'Refund pesanan gagal (' || v_order.order_code || ')', v_order.total);
  end if;

  return v_order;
end;
$function$;

-- ============================================================
-- 5) admin_update_order_status -- REDEFINISI, isinya PERSIS SAMA dengan yang
--    sudah ada (dibaca langsung dari database sebelumnya, bukan tebakan),
--    cuma nambah SATU baris: catat completed_at pas status jadi 'ok'. Aman
--    buat order Telegram yang sudah ada juga (nggak ngubah perilaku lain).
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
  end if;

  return v_order;
end;
$function$;

-- ============================================================
-- 6) Estimasi selesai dari riwayat pesanan asli -- rata-rata durasi
--    created_at -> completed_at buat 1 layanan spesifik. SECURITY DEFINER
--    supaya bisa ngerata-ratain lintas SEMUA pembeli (bukan cuma punya
--    sendiri), tapi CUMA balikin angka agregat (rata-rata + jumlah sampel),
--    sama sekali nggak expose data pesanan siapa pun -- aman dipanggil
--    publik/customer.
-- ============================================================
create or replace function public.get_smm_service_eta(p_service_id uuid)
returns table(avg_minutes numeric, sample_size int)
language sql
security definer
set search_path to 'public'
as $$
  select
    avg(extract(epoch from (completed_at - created_at)) / 60)::numeric,
    count(*)::int
  from public.orders
  where service_id = p_service_id
    and status = 'ok'
    and completed_at is not null;
$$;
