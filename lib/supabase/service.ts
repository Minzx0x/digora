import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Klien khusus buat route yang dipanggil dari LUAR (webhook payment gateway),
// yang tidak punya sesi login user sama sekali — jadi tidak bisa pakai
// lib/supabase/server.ts (itu butuh cookie sesi). Pakai service_role key yang
// melewati RLS sepenuhnya, jadi HANYA dipakai di route server yang sudah
// diverifikasi (signature webhook), TIDAK PERNAH dari komponen client atau
// dari kode yang menerima input mentah dari user langsung.
//
// SUPABASE_SERVICE_ROLE_KEY diambil dari Supabase Dashboard -> Settings ->
// API -> "service_role" (bukan yang "anon"). TANPA prefix NEXT_PUBLIC_ —
// kalau bocor ke browser, siapa pun bisa baca/tulis seluruh database.
export function createServiceClient() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local server.");
    }
    return createSupabaseClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}