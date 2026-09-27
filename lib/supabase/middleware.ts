import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Menjaga sesi Supabase tetap segar di setiap request, dan melindungi
// /dashboard serta /admin dari pengunjung yang belum login.
// Ini kode server (proxy.ts), jadi aman memakai env var tanpa NEXT_PUBLIC_.
export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
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
    }

    return response;
}