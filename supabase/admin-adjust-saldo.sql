-- Admin bisa nambah/kurangi saldo customer secara manual (kompensasi, koreksi
-- kesalahan, dst) dari halaman /admin/pelanggan. Jalankan SEKALI di Supabase
-- SQL Editor. Sama pola dengan RPC admin lain: SECURITY DEFINER, cek is_admin()
-- di awal, catat mutasinya di saldo_mutations biar kelihatan di riwayat saldo
-- customer juga (SaldoView/ProfilView baca dari tabel yang sama).
create or replace function public.admin_adjust_saldo(p_user_id uuid, p_amount bigint, p_reason text default '')
returns profiles
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'not_admin';
  end if;
  if p_amount = 0 then
    raise exception 'invalid_amount';
  end if;

  update public.profiles
  set saldo = saldo + p_amount
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'user_not_found';
  end if;
  -- Cegah salah ketik bikin saldo customer minus -- kalau memang mau
  -- ngurangin lebih dari saldo yang ada, itu kemungkinan besar salah input.
  if v_profile.saldo < 0 then
    raise exception 'insufficient_saldo';
  end if;

  insert into public.saldo_mutations (user_id, description, amount)
  values (
    p_user_id,
    case
      when trim(coalesce(p_reason, '')) = '' and p_amount > 0 then 'Penambahan saldo manual oleh admin'
      when trim(coalesce(p_reason, '')) = '' then 'Pengurangan saldo manual oleh admin'
      when p_amount > 0 then 'Penambahan saldo manual oleh admin: ' || p_reason
      else 'Pengurangan saldo manual oleh admin: ' || p_reason
    end,
    p_amount
  );

  return v_profile;
end;
$function$;
