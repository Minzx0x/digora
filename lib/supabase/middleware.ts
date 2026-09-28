import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Menjaga sesi Supabase tetap segar di setiap request, dan melindungi
// /dashboard serta /admin dari pengunjung yang belum login.
// Ini kode server (proxy.ts), jadi aman memakai env var tanpa NEXT_PUBLIC_.
export async function updateSession(request: NextRequest) {
    // Header ini dibaca ulang oleh requireAdmin() di lib/actions/admin.ts lewat
    // next/headers, supaya Server Action di halaman admin TIDAK perlu manggil
    // auth.getUser() + query role lagi dari nol setiap navigasi — udah
    // diverifikasi di sini sekali. Cuma bisa di-set dari server (middleware),
    // request dari browser tidak bisa nyuntik header ini sendiri, jadi aman.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("x-digora-uid");
    requestHeaders.delete("x-digora-role");

    // Supabase mungkin perlu refresh token (set cookie baru) di tengah
    // auth.getUser() di bawah. Ditampung dulu di sini, baru diterapkan ke
    // response FINAL di akhir — supaya tidak ke-timpa waktu response dibuat
    // ulang setelah tau isAdminArea/role.
    let pendingCookies: { name: string; value: string; options: CookieOptions }[] = [];

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                pendingCookies = cookiesToSet;
            },
        },
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isAdminArea = path.startsWith("/admin") && path !== "/admin/login";
    const needsAuth = path.startsWith("/dashboard") || isAdminArea;
    const loginPath = isAdminArea ? "/admin/login" : "/login";

    if (needsAuth && !user) {
        const url = request.nextUrl.clone();
        url.pathname = loginPath;
        url.searchParams.set("next", path);
        return NextResponse.redirect(url);
    }

    // /admin butuh role "admin" di tabel profiles, bukan cuma "sudah login" —
    // user biasa yang login lewat /login tidak boleh bisa buka /admin.
    if (isAdminArea && user) {
        const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
        if (profile?.role !== "admin") {
            return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        requestHeaders.set("x-digora-uid", user.id);
        requestHeaders.set("x-digora-role", profile.role);
    } else if (user) {
        requestHeaders.set("x-digora-uid", user.id);
    }

    // Response FINAL dibuat sekali di sini, dengan header lengkap — baru abis
    // itu cookie hasil refresh token (kalau ada) diterapkan ke response ini.
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    pendingCookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
}