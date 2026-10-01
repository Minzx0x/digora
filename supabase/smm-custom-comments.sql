-- Dukungan layanan SMM tipe "Custom Comments" (customer isi teks komentar
-- sendiri, 1 per baris -- bukan cuma angka Jumlah biasa kayak tipe Default).
-- Jalankan SEKALI di Supabase Dashboard -> SQL Editor, SETELAH smm.sql.
--
-- "Jumlah" buat tipe ini = banyak baris komentar yang diisi (bukan dikirim
-- customer sebagai angka terpisah) -- dihitung di RPC dari p_comments, bukan
-- dipercaya dari client, biar harga nggak bisa dimanipulasi.

-- ============================================================
-- 1) Kolom baru
-- ============================================================
alter table public.smm_services add column if not exists service_type text not null default 'Default';
alter table public.orders add column if not exists comments text;

-- ============================================================
-- 2) buy_smm_with_saldo -- tambah p_comments, p_quantity jadi opsional (salah
--    satu wajib tergantung service_type). Argumen berubah dari 3 jadi 4 --
--    versi lama HARUS di-drop dulu, kalau tidak PostgREST bingung ada 2
--    fungsi "buy_smm_with_saldo" yang sama-sama cocok (sama kasusnya kayak
--    reply_ticket yang kemarin double).
-- ============================================================
drop function if exists public.buy_smm_with_saldo(uuid, text, integer);

create or replace function public.buy_smm_with_saldo(
  p_service_id uuid,
  p_target_link text,
  p_quantity integer default null,
  p_comments text default null
)
returns orders
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_saldo bigint;
  v_service public.smm_services;
  v_quantity integer;
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

  if v_service.service_type = 'Custom Comments' then
    if p_comments is null or trim(p_comments) = '' then
      raise exception 'invalid_amount';
    end if;
    select count(*) into v_quantity
    from unnest(string_to_array(p_comments, chr(10))) as line
    where trim(line) <> '';
  else
    v_quantity := p_quantity;
  end if;

  if v_quantity is null or v_quantity < v_service.min_quantity or v_quantity > v_service.max_quantity then
    raise exception 'invalid_amount';
  end if;

  v_total := round(v_service.price_per_1000 * v_quantity / 1000.0);

  select saldo into v_saldo from public.profiles where id = v_uid for update;
  if v_saldo is null then
    raise exception 'profile_not_found';
  end if;
  if v_saldo < v_total then
    raise exception 'insufficient_balance';
  end if;

  update public.profiles set saldo = saldo - v_total where id = v_uid;

  v_code := 'DG-' || nextval('public.order_code_seq');

  insert into public.orders (user_id, order_code, kind, package_label, units, total, status, target_link, provider, service_id, comments)
  values (v_uid, v_code, 'smm', v_service.name, v_quantity, v_total, 'proc', p_target_link, 'smmflare', p_service_id, p_comments)
  returning * into v_order;

  insert into public.saldo_mutations (user_id, description, amount)
  values (v_uid, 'Beli ' || v_service.name || ' (' || v_code || ')', -v_total);

  return v_order;
end;
$function$;
