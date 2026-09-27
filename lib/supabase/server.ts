import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Hanya dipakai di server (Server Component, Server Action, Route Handler).
// SUPABASE_URL/SUPABASE_ANON_KEY sengaja TANPA prefix NEXT_PUBLIC_, jadi tidak
// pernah ikut ter-bundle ke kode yang dikirim ke browser.
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
                } catch {
                    // dipanggil dari Server Component tanpa izin set-cookie; proxy.ts yang menangani refresh sesi.
                }
            },
        },
    });
}