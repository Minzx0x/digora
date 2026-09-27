"use server";

import { createClient } from "@/lib/supabase/server";

// Pesan error Supabase (Inggris) diterjemahkan ke yang lebih ramah.
function friendlyAuthError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("invalid login credentials")) return "Email atau password salah.";
    if (m.includes("already registered") || m.includes("already been registered"))
        return "Email ini sudah terdaftar. Coba masuk saja.";
    if (m.includes("email not confirmed")) return "Email belum dikonfirmasi. Cek kotak masuk emailmu.";
    if (m.includes("password") && m.includes("at least")) return "Password minimal 8 karakter.";
    if (m.includes("rate limit")) return "Terlalu banyak percobaan. Coba lagi sebentar lagi.";
    if (m.includes("failed to fetch") || m.includes("fetch failed") || m.includes("network"))
        return "Tidak bisa terhubung ke Supabase. Cek SUPABASE_URL di .env.local.";
    return message;
}

export async function signInAction(
    email: string,
    password: string,
): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: friendlyAuthError(error.message) };
    return { error: null };
}

export async function signUpAction(input: {
    email: string;
    password: string;
    name: string;
    username: string;
}): Promise<{ error: string | null; needsConfirm: boolean }> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
            // TODO: simpan juga di tabel "profiles" (id, name, telegram_username) lewat trigger
            // on_auth_user_created di Supabase, supaya gampang di-query/di-join.
            data: { name: input.name, telegram_username: input.username.replace(/^@/, "") },
        },
    });
    if (error) return { error: friendlyAuthError(error.message), needsConfirm: false };
    // Kalau project Supabase mewajibkan konfirmasi email, session masih kosong di sini.
    return { error: null, needsConfirm: !data.session };
}

export async function signOutAction(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
}

// Login khusus /admin: sama seperti signInAction, tapi setelah berhasil dicek
// dulu apakah akun ini memang role "admin" di tabel profiles. Kalau bukan,
// sesi langsung di-signout lagi supaya tidak nyangkut login sebagai user biasa.
export async function adminSignInAction(
    email: string,
    password: string,
): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: friendlyAuthError(error.message) };

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();

    if (profile?.role !== "admin") {
        await supabase.auth.signOut();
        return { error: "Akun ini bukan akun admin." };
    }
    return { error: null };
}