"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getRscBalanceUsd, getRscOrderStatus, mapRscStatus, RscError } from "@/lib/rsc";
import {
    getSmmflareOrderStatus,
    mapSmmflareStatus,
    refillSmmflareOrder,
    getSmmflareRefillStatus,
    cancelSmmflareOrder,
    SmmflareError,
} from "@/lib/smmflare";
import type { PackageRow } from "@/lib/actions/catalog";

// Dipakai berulang di semua action admin.ts: pastikan yang manggil sudah login
// DAN role-nya admin, sebelum lanjut baca/ubah data lintas-user. proxy.ts sudah
// menolak akses ke /admin duluan (dan role-nya sudah dicek di sana juga) — ini
// lapisan jaga-jaga kedua, tapi TIDAK perlu ulang auth.getUser() + query role
// dari nol tiap panggil (itu 2 round-trip Supabase yang bikin tiap pindah
// menu admin kerasa berat). proxy.ts nitipin hasil verifikasinya lewat header
// x-digora-uid/x-digora-role; kalau ada, langsung dipercaya. Fallback ke cara
// lama cuma buat kondisi yang gak lewat proxy.ts (mis. dipanggil dari luar
// alur normal), jadi tetap aman.
export async function requireAdmin() {
    const supabase = await createClient();
    const h = await headers();
    const headerUid = h.get("x-digora-uid");
    const headerRole = h.get("x-digora-role");

    if (headerUid) {
        return { supabase, uid: headerUid, ok: headerRole === "admin" };
    }

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { supabase, uid: null as string | null, ok: false as const };
    const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    return { supabase, uid: auth.user.id, ok: me?.role === "admin" };
}

export type AdminStatus = "ok" | "proc" | "wait" | "fail";

export type AdminOrderRow = {
    id: string;
    code: string;
    username: string;
    packageLabel: string;
    units: number;
    total: number;
    status: AdminStatus;
    time: string; // ISO
    rscOrderNumber: number | null;
    failReason: string;
    // Pesanan SMM (lihat lib/smmflare.ts + supabase/smm.sql) numpang di tabel
    // orders yang sama — dua field ini generik biar bisa nampung supplier lain
    // di masa depan tanpa nambah kolom rsc_* lagi tiap ada supplier baru.
    provider: string; // "rsc" (default, order Telegram lama) | "smmflare"
    providerOrderId: number | null;
    // Cuma keisi buat order SMM tipe "Custom Comments" (lihat
    // supabase/smm-custom-comments.sql) — teks komentar mentah yang disubmit
    // customer, 1 per baris. Order lain (Default/Telegram) selalu null.
    comments: string | null;
};

// Baris mentah dari select orders dipakai di dua tempat (Ringkasan & halaman
// Pesanan penuh) — disatukan di sini biar konsisten. Order SMM tidak punya
// target_username (kolomnya NULL, lihat supabase/smm.sql), jadi "username" di
// sini sebenarnya lebih tepat dibaca sebagai "tujuan pesanan" — link buat SMM,
// @username buat Telegram. rscOrderNumber tetap dari kolom lama (order Telegram
// existing), providerOrderId dari kolom baru yang generik (order SMM).
function mapAdminOrderRow(o: Record<string, unknown>): AdminOrderRow {
    const kind = o.kind as string;
    return {
        id: o.id as string,
        code: o.order_code as string,
        username: kind === "smm" ? ((o.target_link as string) ?? "") : "@" + (o.target_username as string),
        packageLabel: o.package_label as string,
        units: Number(o.units),
        total: Number(o.total),
        status: o.status as AdminStatus,
        time: o.created_at as string,
        rscOrderNumber: o.rsc_order_number === null || o.rsc_order_number === undefined ? null : Number(o.rsc_order_number),
        failReason: (o.fail_reason as string) ?? "",
        provider: (o.provider as string) ?? "rsc",
        providerOrderId:
            o.provider_order_id === null || o.provider_order_id === undefined ? null : Number(o.provider_order_id),
        comments: (o.comments as string | null) ?? null,
    };
}

// v = Rupiah MENTAH (bukan pra-skala ke jutaan) -- Chart di AdminOverview.tsx
// yang nentuin unit tampilan (rb/jt) secara adaptif sesuai skala datanya
// sendiri. Sebelumnya di sini dibulatkan ke 0.1jt (~Rp100rb) duluan, jadi
// pendapatan harian yang cuma puluhan ribu Rupiah (wajar buat toko SMM
// kecil-kecilan) kebulat jadi 0 dan grafiknya keliatan kosong padahal
// transaksinya beneran ada.
export type RevenuePoint = { l: string; v: number };

// Saldo supplier dipisah dari AdminData dan diambil lewat getRscBalance()
// sendiri (lihat di bawah), supaya halaman Ringkasan TIDAK ikut nunggu kalau
// API supplier lambat/hang — cuma kartu saldo ini yang nunggu, di-stream
// belakangan lewat <Suspense>, sisanya (pesanan, grafik, dll) langsung tampil.
export type RscBalanceInfo = {
    rscBalanceIdr: number | null;
    rscConfigured: boolean;
    rscBalanceError: string | null;
};

export type AdminData = {
    isAdmin: boolean;
    todayOrders: number;
    todayOrdersDelta: number;
    todayRevenue: number;
    todayRevenueDeltaPct: number | null;
    waitingCount: number;
    customerCount: number;
    revenue7: RevenuePoint[];
    revenue30: RevenuePoint[];
    orders: AdminOrderRow[];
    usdIdrRate: number;
};

const EMPTY: AdminData = {
    isAdmin: false,
    todayOrders: 0,
    todayOrdersDelta: 0,
    todayRevenue: 0,
    todayRevenueDeltaPct: null,
    waitingCount: 0,
    customerCount: 0,
    revenue7: [],
    revenue30: [],
    orders: [],
    usdIdrRate: 16300,
};

function dayKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

// timeZone: "UTC" WAJIB -- d di sini selalu dibikin dari komponen UTC (lihat
// startOfToday/series di bawah), disamain sama dayKey yang juga baca
// toISOString (UTC). Tanpa ini, di server yang jalan di timezone selain UTC
// (mis. WIB) hasilnya BISA beda: date-nya sudah bener tapi weekday-nya salah
// atau (kalau dayKey dibikin pakai getDate()/setDate() versi lokal, seperti
// sebelumnya) key-nya sama sekali gak pernah match sama revenueByDay yang
// dikunci dari created_at (UTC) -- itu penyebab grafik Pendapatan kelihatan
// kosong padahal transaksinya ada.
function dayLabel(d: Date): string {
    return d.toLocaleDateString("id-ID", { weekday: "short", timeZone: "UTC" });
}

// Dipakai app/admin/page.tsx untuk mengisi seluruh halaman Ringkasan admin
// dengan data asli (stok, pesanan, pendapatan, grafik, daftar pesanan terbaru).
// Mengembalikan isAdmin:false + data kosong kalau yang minta bukan admin —
// proxy.ts sudah menolak akses sebelum sampai sini, ini lapisan jaga-jaga kedua.
export async function getAdminData(): Promise<AdminData> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return EMPTY;

    const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (me?.role !== "admin") return EMPTY;

    const now = new Date();
    // Komponen UTC (bukan getFullYear/getMonth/getDate lokal) -- lihat catatan
    // di dayLabel() soal kenapa seluruh pipeline tanggal di sini harus UTC.
    const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const start30 = new Date(startOfToday);
    start30.setUTCDate(start30.getUTCDate() - 29);

    const [{ data: settings }, { count: customerCount }, { data: ordersRaw }, { data: last30 }] = await Promise.all([
        supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle(),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
            .from("orders")
            .select(
                "id, order_code, target_username, target_link, kind, package_label, units, total, status, created_at, rsc_order_number, provider, provider_order_id, fail_reason, comments",
            )
            .order("created_at", { ascending: false })
            .limit(200),
        supabase.from("orders").select("total, status, created_at").gte("created_at", start30.toISOString()),
    ]);

    const orders: AdminOrderRow[] = (ordersRaw ?? []).map(mapAdminOrderRow);

    const waitingCount = orders.filter((o) => o.status === "wait" || o.status === "proc").length;

    const revenueByDay = new Map<string, number>();
    const ordersByDay = new Map<string, number>();
    for (const row of last30 ?? []) {
        const key = dayKey(new Date(row.created_at as string));
        ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
        if (row.status === "ok") {
            revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(row.total));
        }
    }

    function series(days: number): RevenuePoint[] {
        const out: RevenuePoint[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date(startOfToday);
            d.setUTCDate(d.getUTCDate() - i);
            const key = dayKey(d);
            out.push({ l: dayLabel(d), v: revenueByDay.get(key) ?? 0 });
        }
        return out;
    }

    const todayKey = dayKey(startOfToday);
    const yesterday = new Date(startOfToday);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yestKey = dayKey(yesterday);

    const todayOrders = ordersByDay.get(todayKey) ?? 0;
    const yesterdayOrders = ordersByDay.get(yestKey) ?? 0;
    const todayRevenue = revenueByDay.get(todayKey) ?? 0;
    const yesterdayRevenue = revenueByDay.get(yestKey) ?? 0;
    const usdIdrRate = Number(settings?.usd_idr_rate ?? 16300);

    return {
        isAdmin: true,
        todayOrders,
        todayOrdersDelta: todayOrders - yesterdayOrders,
        todayRevenue,
        todayRevenueDeltaPct:
            yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : null,
        waitingCount,
        customerCount: customerCount ?? 0,
        revenue7: series(7),
        revenue30: series(30),
        orders,
        usdIdrRate,
    };
}

// Saldo yang masih tersisa di akun supplier — dipisah dari getAdminData()
// dan dipanggil dari komponen server tersendiri yang dibungkus <Suspense>
// (lihat components/SupplierBalanceCard.tsx). Best-effort: kalau supplier-nya
// lambat/hang/error, ini gagal sendiri tanpa nge-block bagian lain halaman.
export async function getRscBalance(usdIdrRate: number): Promise<RscBalanceInfo> {
    const rscConfigured = !!process.env.RSC_API_KEY;
    if (!rscConfigured) {
        return { rscBalanceIdr: null, rscConfigured: false, rscBalanceError: null };
    }

    try {
        const usd = await getRscBalanceUsd();
        return { rscBalanceIdr: Math.round(usd * usdIdrRate), rscConfigured: true, rscBalanceError: null };
    } catch (e) {
        // Log pesannya doang (bukan seluruh objek error) — supaya nama/detail
        // supplier tidak ikut nyangkut di terminal lewat stack trace/nama class.
        console.error("[admin] gagal ambil saldo supplier:", e instanceof Error ? e.message : e);
        return {
            rscBalanceIdr: null,
            rscConfigured: true,
            rscBalanceError: e instanceof RscError ? e.message : "Gagal ambil saldo supplier.",
        };
    }
}

export async function updateUsdIdrRateAction(rate: number): Promise<{ error: string | null }> {
    if (!Number.isFinite(rate) || rate <= 0) return { error: "Kurs tidak valid." };
    const supabase = await createClient();
    const { error } = await supabase.from("app_settings").update({ usd_idr_rate: rate }).eq("id", true);
    if (error) return { error: "Gagal menyimpan kurs. Pastikan akun ini admin." };
    revalidatePath("/admin", "layout");
    return { error: null };
}

// Harga jual TIDAK diset langsung — dihitung server-side (trigger di Postgres) dari
// modal (cost_price) x markup (margin_percent), supaya kalau modal nanti disinkron
// dari API supplier lain, tinggal update cost_price dan harga jual ikut menyesuaikan.
export async function updatePackageCostAction(
    id: string,
    costPrice: number,
    marginPercent: number,
): Promise<{ error: string | null }> {
    if (!Number.isFinite(costPrice) || costPrice < 0) return { error: "Modal tidak valid." };
    if (!Number.isFinite(marginPercent) || marginPercent < 0) return { error: "Markup tidak valid." };
    const supabase = await createClient();
    const { error } = await supabase
        .from("packages")
        .update({ cost_price: costPrice, margin_percent: marginPercent })
        .eq("id", id);
    if (error) return { error: "Gagal menyimpan. Pastikan akun ini admin." };
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}

export async function addStockAction(amount: number): Promise<{ error: string | null }> {
    if (!Number.isFinite(amount) || amount === 0) return { error: "Jumlah tidak valid." };
    const supabase = await createClient();
    const { data: current } = await supabase.from("app_settings").select("stars_stock").eq("id", true).maybeSingle();
    const next = Math.max(0, Number(current?.stars_stock ?? 0) + Math.round(amount));
    const { error } = await supabase.from("app_settings").update({ stars_stock: next }).eq("id", true);
    if (error) return { error: "Gagal update stok. Pastikan akun ini admin." };
    revalidatePath("/admin", "layout");
    return { error: null };
}

// ============================================================
// Halaman Pesanan (daftar penuh, bukan cuma 200 terbaru di Ringkasan)
// ============================================================
export async function getAllOrdersData(): Promise<{ isAdmin: boolean; orders: AdminOrderRow[] }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { isAdmin: false, orders: [] };

    const { data: ordersRaw } = await supabase
        .from("orders")
        .select(
            "id, order_code, target_username, target_link, kind, package_label, units, total, status, created_at, rsc_order_number, provider, provider_order_id, fail_reason, comments",
        )
        .order("created_at", { ascending: false })
        .limit(1000);

    const orders: AdminOrderRow[] = (ordersRaw ?? []).map(mapAdminOrderRow);

    return { isAdmin: true, orders };
}

// Admin ubah status order manual (mis. tandai Selesai setelah dicek manual, atau
// Gagal kalau memang tidak terkirim — otomatis refund saldo pembeli kalau ditandai gagal).
export async function adminUpdateOrderStatusAction(
    orderId: string,
    status: AdminStatus,
    reason?: string,
): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("admin_update_order_status", {
        p_order_id: orderId,
        p_status: status,
        p_reason: status === "fail" ? (reason ?? "Ditandai gagal oleh admin.") : "",
    });
    if (error) return { error: "Gagal update status. Pastikan akun ini admin." };
    revalidatePath("/admin/pesanan");
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}

// Tarik ulang status order ini dari RSC (cuma jalan kalau order-nya memang
// punya rsc_order_number, artinya sebelumnya berhasil diteruskan ke RSC).
export async function adminCheckRscOrderAction(
    orderId: string,
    rscOrderNumber: number,
): Promise<{ error: string | null }> {
    try {
        const rscOrder = await getRscOrderStatus(rscOrderNumber);
        const supabase = await createClient();
        // fail_reason ini juga kebaca sama PEMBELI di riwayat pesanannya sendiri —
        // jangan simpan status mentah dari supplier di sini, cukup teks generik.
        // Status mentahnya tetap ada di kolom rsc_status buat admin cek manual.
        const { error } = await supabase.rpc("admin_update_order_status", {
            p_order_id: orderId,
            p_status: mapRscStatus(rscOrder.status),
            p_reason: mapRscStatus(rscOrder.status) === "fail" ? "Pesanan gagal diproses." : "",
        });
        if (error) return { error: "Gagal simpan status. Pastikan akun ini admin." };
        revalidatePath("/admin/pesanan");
        revalidatePath("/admin", "layout");
        revalidatePath("/dashboard", "layout");
        return { error: null };
    } catch (e) {
        return { error: e instanceof RscError ? e.message : "Gagal ambil status dari supplier." };
    }
}

// Tarik ulang status order SMM ini dari smmflare — sama polanya dengan
// adminCheckRscOrderAction di atas, cuma beda supplier. Reuse admin_update_order_status
// yang sama (sudah generik, tidak ada logic khusus RSC di dalamnya).
export async function adminCheckSmmOrderAction(
    orderId: string,
    providerOrderId: number,
): Promise<{ error: string | null }> {
    try {
        const smmOrder = await getSmmflareOrderStatus(providerOrderId);
        const supabase = await createClient();
        const { error } = await supabase.rpc("admin_update_order_status", {
            p_order_id: orderId,
            p_status: mapSmmflareStatus(smmOrder.status),
            p_reason: mapSmmflareStatus(smmOrder.status) === "fail" ? "Pesanan gagal diproses." : "",
        });
        if (error) return { error: "Gagal simpan status. Pastikan akun ini admin." };
        revalidatePath("/admin/pesanan");
        revalidatePath("/admin", "layout");
        revalidatePath("/dashboard", "layout");
        return { error: null };
    } catch (e) {
        return { error: e instanceof SmmflareError ? e.message : "Gagal ambil status dari supplier." };
    }
}

// Minta smmflare kirim ulang (refill) satu order SMM yang engagement-nya drop.
// TIDAK mengubah status/total order kita (refill gratis dari sisi supplier) —
// makanya nggak lewat admin_update_order_status, cukup dilaporkan ID refill-nya
// ke admin buat dicek lagi manual (adminCheckRefillStatusAction di bawah).
export async function adminRefillSmmOrderAction(providerOrderId: number): Promise<{ error: string | null; refillId?: number }> {
    const { ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };
    try {
        const { refillId } = await refillSmmflareOrder(providerOrderId);
        return { error: null, refillId };
    } catch (e) {
        return { error: e instanceof SmmflareError ? e.message : "Gagal minta refill ke supplier." };
    }
}

export async function adminCheckRefillStatusAction(refillId: number): Promise<{ error: string | null; status?: string }> {
    const { ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };
    try {
        const status = await getSmmflareRefillStatus(refillId);
        return { error: null, status };
    } catch (e) {
        return { error: e instanceof SmmflareError ? e.message : "Gagal ambil status refill dari supplier." };
    }
}

// Batalkan order SMM yang belum selesai di supplier — kalau supplier konfirmasi
// batal, order kita ditandai 'fail' lewat RPC yang sudah ada (admin_update_order_status),
// yang OTOMATIS refund saldo pembeli juga. Tidak ada RPC baru yang dibutuhkan.
export async function adminCancelSmmOrderAction(orderId: string, providerOrderId: number): Promise<{ error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };
    try {
        const res = await cancelSmmflareOrder(providerOrderId);
        if (!res.cancelled) return { error: res.error ?? "Gagal membatalkan pesanan di supplier." };

        const { error } = await supabase.rpc("admin_update_order_status", {
            p_order_id: orderId,
            p_status: "fail",
            p_reason: "Pesanan dibatalkan di supplier oleh admin.",
        });
        if (error) return { error: "Dibatalkan di supplier, tapi gagal simpan status di Digora." };
        revalidatePath("/admin/pesanan");
        revalidatePath("/admin", "layout");
        revalidatePath("/dashboard", "layout");
        return { error: null };
    } catch (e) {
        return { error: e instanceof SmmflareError ? e.message : "Gagal membatalkan pesanan di supplier." };
    }
}

// ============================================================
// Halaman Pelanggan
// ============================================================
export type CustomerRow = {
    id: string;
    name: string;
    telegramUsername: string;
    email: string;
    saldo: number;
    role: "user" | "admin";
    createdAt: string;
    orderCount: number;
    totalSpent: number; // jumlah order berstatus "ok" (selesai)
};

export async function getCustomersData(): Promise<{ isAdmin: boolean; customers: CustomerRow[] }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { isAdmin: false, customers: [] };

    const [{ data: profiles }, { data: orders }] = await Promise.all([
        supabase
            .from("profiles")
            .select("id, name, telegram_username, email, saldo, role, created_at")
            .order("created_at", { ascending: false }),
        supabase.from("orders").select("user_id, total, status"),
    ]);

    const stat = new Map<string, { count: number; spent: number }>();
    for (const o of orders ?? []) {
        const uid = o.user_id as string;
        const s = stat.get(uid) ?? { count: 0, spent: 0 };
        s.count += 1;
        if (o.status === "ok") s.spent += Number(o.total);
        stat.set(uid, s);
    }

    const customers: CustomerRow[] = (profiles ?? []).map((p) => ({
        id: p.id as string,
        name: (p.name as string) || "(tanpa nama)",
        telegramUsername: (p.telegram_username as string) || "",
        email: p.email as string,
        saldo: Number(p.saldo ?? 0),
        role: p.role as "user" | "admin",
        createdAt: p.created_at as string,
        orderCount: stat.get(p.id as string)?.count ?? 0,
        totalSpent: stat.get(p.id as string)?.spent ?? 0,
    }));

    return { isAdmin: true, customers };
}

// Admin nambah/kurangi saldo customer manual (kompensasi, koreksi, dst) —
// amount POSITIF buat nambah, NEGATIF buat ngurangi. RPC yang nolak kalau
// hasilnya bikin saldo minus (lihat supabase/admin-adjust-saldo.sql).
export async function adminAdjustSaldoAction(userId: string, amount: number, reason: string): Promise<{ error: string | null }> {
    if (!Number.isFinite(amount) || amount === 0) return { error: "Isi jumlah saldo dulu." };
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };

    const { error } = await supabase.rpc("admin_adjust_saldo", {
        p_user_id: userId,
        p_amount: Math.round(amount),
        p_reason: reason.trim(),
    });
    if (error) {
        if (error.message.includes("insufficient_saldo")) return { error: "Saldo customer tidak cukup buat dikurangi sebanyak itu." };
        return { error: "Gagal ubah saldo. Pastikan akun ini admin." };
    }
    revalidatePath("/admin/pelanggan");
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}

// ============================================================
// Halaman Pembayaran — riwayat saldo semua user (top up, refund, pemakaian)
// ============================================================
export type PaymentRow = {
    id: string;
    userName: string;
    userEmail: string;
    description: string;
    amount: number; // positif = top up/refund, negatif = pemakaian beli
    time: string;
};

export async function getPaymentsData(): Promise<{ isAdmin: boolean; payments: PaymentRow[] }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { isAdmin: false, payments: [] };

    const { data: mutations } = await supabase
        .from("saldo_mutations")
        .select("id, user_id, description, amount, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

    const userIds = [...new Set((mutations ?? []).map((m) => m.user_id as string))];
    const { data: profiles } =
        userIds.length > 0
            ? await supabase.from("profiles").select("id, name, email").in("id", userIds)
            : { data: [] as { id: string; name: string; email: string }[] };

    const nameMap = new Map((profiles ?? []).map((p) => [p.id as string, { name: p.name as string, email: p.email as string }]));

    const payments: PaymentRow[] = (mutations ?? []).map((m) => ({
        id: m.id as string,
        userName: nameMap.get(m.user_id as string)?.name || "-",
        userEmail: nameMap.get(m.user_id as string)?.email || "-",
        description: m.description as string,
        amount: Number(m.amount),
        time: m.created_at as string,
    }));

    return { isAdmin: true, payments };
}

// ============================================================
// Halaman Pengaturan
// ============================================================
export type SettingsData = {
    isAdmin: boolean;
    adminEmail: string;
    usdIdrRate: number;
    stock: number;
    rscConfigured: boolean;
    referralBonusPercent: number;
    referralBonusCap: number;
};

// ============================================================
// Halaman Paket & Harga
// ============================================================
export type PaketData = {
    isAdmin: boolean;
    usdIdrRate: number;
    catalog: PackageRow[];
};

export async function getPaketData(): Promise<PaketData> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { isAdmin: false, usdIdrRate: 16300, catalog: [] };

    const [{ data: settings }, { data: packagesRaw }] = await Promise.all([
        supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle(),
        supabase
            .from("packages")
            .select("id, kind, label, amount, unit, price, cost_price, margin_percent, note")
            .eq("active", true)
            .order("kind", { ascending: true })
            .order("sort_order", { ascending: true }),
    ]);

    const catalog: PackageRow[] = (packagesRaw ?? []).map((p) => ({
        id: p.id as string,
        kind: p.kind as "stars" | "premium",
        label: p.label as string,
        amount: Number(p.amount),
        unit: p.unit as string,
        price: Number(p.price),
        costPrice: Number(p.cost_price ?? 0),
        marginPercent: Number(p.margin_percent ?? 0),
        note: p.note as string,
    }));

    return { isAdmin: true, usdIdrRate: Number(settings?.usd_idr_rate ?? 16300), catalog };
}

export async function getSettingsData(): Promise<SettingsData> {
    const { supabase, uid, ok } = await requireAdmin();
    if (!ok || !uid) {
        return {
            isAdmin: false,
            adminEmail: "",
            usdIdrRate: 16300,
            stock: 0,
            rscConfigured: false,
            referralBonusPercent: 10,
            referralBonusCap: 1500,
        };
    }
    const [{ data: auth }, { data: settings }] = await Promise.all([
        supabase.auth.getUser(),
        supabase
            .from("app_settings")
            .select("stars_stock, usd_idr_rate, referral_bonus_percent, referral_bonus_cap")
            .eq("id", true)
            .maybeSingle(),
    ]);
    return {
        isAdmin: true,
        adminEmail: auth.user?.email ?? "",
        usdIdrRate: Number(settings?.usd_idr_rate ?? 16300),
        stock: Number(settings?.stars_stock ?? 0),
        // Cuma kirim status ada/tidaknya ke client, TIDAK PERNAH kirim isi key-nya.
        rscConfigured: !!process.env.RSC_API_KEY,
        referralBonusPercent: Number(settings?.referral_bonus_percent ?? 10),
        referralBonusCap: Number(settings?.referral_bonus_cap ?? 1500),
    };
}

export async function updateReferralBonusAction(
    bonusPercent: number,
    bonusCap: number,
): Promise<{ error: string | null }> {
    // >50% dikunci biar admin nggak kepencet set komisi gila-gilaan yang bikin
    // program ini jadi rugi/gampang diakalin -- lihat pembahasan celah akun
    // kembar di supabase/referrals.sql.
    if (!Number.isFinite(bonusPercent) || bonusPercent < 0 || bonusPercent > 50) {
        return { error: "Persentase tidak valid (maks 50%)." };
    }
    // Dikunci ke nominal fee flat termurah (e-wallet, Rp1.500) -- lebih dari
    // itu, orang bisa top up pakai e-wallet/bank transfer (fee-nya flat, nggak
    // ikut naik kayak QRIS) terus dapat untung bersih tiap siklus dari selisih
    // komisi vs fee. Lihat pembahasan celah ini di supabase/referrals.sql.
    if (!Number.isFinite(bonusCap) || bonusCap < 0 || bonusCap > 1500) {
        return { error: "Nominal maksimal tidak valid (maks Rp1.500, biar nggak jadi celah akun kembar)." };
    }
    const supabase = await createClient();
    const { error } = await supabase
        .from("app_settings")
        .update({ referral_bonus_percent: bonusPercent, referral_bonus_cap: bonusCap })
        .eq("id", true);
    if (error) return { error: "Gagal menyimpan. Pastikan akun ini admin." };
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}