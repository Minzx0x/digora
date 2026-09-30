import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Semua link email Supabase (konfirmasi daftar, reset password, dll) diarahkan
// ke sini dulu ("redirectTo") sebelum lanjut ke halaman tujuan aslinya
// ("next"). Tugasnya cuma satu: tukar kode sementara dari link itu jadi sesi
// login beneran (cookie), soalnya tanpa langkah ini sesi gak pernah kebentuk
// walau link-nya valid.
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const rawNext = searchParams.get("next");
    // Cuma terima path internal ("/xxx") -- endpoint ini publik (siapa pun
    // bisa buka "/auth?code=...&next=...") jadi "next" bisa dipakai buat
    // open redirect kalau nggak divalidasi, sama kelasnya dengan yang di
    // AdminLoginForm.tsx.
    const next = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Link kadaluarsa, sudah pernah dipakai, atau kode gak valid — balik ke
    // login. Halaman /reset-password sendiri juga ngecek ada-gaknya sesi buat
    // nunjukin pesan "link kadaluarsa" yang lebih jelas kalau memang nyasar ke situ.
    return NextResponse.redirect(`${origin}/login`);
}