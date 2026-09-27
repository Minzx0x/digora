"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRscBalanceUsd, getRscOrderStatus, mapRscStatus, RscError } from "@/lib/rsc";
import type { PackageRow } from "@/lib/actions/catalog";

// Dipakai berulang di semua action admin.ts: pastikan yang manggil sudah login
// DAN role-nya admin, sebelum lanjut baca/ubah data lintas-user. proxy.ts sudah
// menolak akses ke /admin duluan, ini lapisan jaga-jaga kedua di server action.
async function requireAdmin() {
    const supabase = await createClient();
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
};

export type RevenuePoint = { l: string; v: number };

export type AdminData = {
    isAdmin: boolean;
    // Dulu ini angka "stok Stars" yang diisi manual admin (addStockAction).
    // Sekarang diganti saldo ASLI yang masih ada di akun supplier RSC
    // (resell.codes) — itu yang beneran membatasi berapa banyak pesanan Stars
    // & Premium yang masih bisa diteruskan ke pelanggan. Dikonversi ke Rupiah
    // pakai kurs yang sama dengan Paket & Harga (usd_idr_rate).
    rscBalanceIdr: number | null;
    rscConfigured: boolean;
    rscBalanceError: string | null;
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
    rscBalanceIdr: null,
    rscConfigured: false,
    rscBalanceError: null,
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

function dayLabel(d: Date): string {
    return d.toLocaleDateString("id-ID", { weekday: "short" });
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
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start30 = new Date(startOfToday);
    start30.setDate(start30.getDate() - 29);

    const rscConfigured = !!process.env.RSC_API_KEY;

    const [{ data: settings }, { count: customerCount }, { data: ordersRaw }, { data: last30 }, rscBalanceResult] =
        await Promise.all([
            supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle(),
            supabase.from("profiles").select("id", { count: "exact", head: true }),
            supabase
                .from("orders")
                .select(
                    "id, order_code, target_username, package_label, units, total, status, created_at, rsc_order_number, fail_reason",
                )
                .order("created_at", { ascending: false })
                .limit(200),
            supabase.from("orders").select("total, status, created_at").gte("created_at", start30.toISOString()),
            // Saldo RSC dari API supplier — best-effort, jangan sampai satu request
            // yang gagal (mis. API key belum diisi) bikin seluruh Ringkasan error.
            rscConfigured
                ? getRscBalanceUsd().then(
                    (usd) => ({ usd, error: null as string | null }),
                    (e) => ({ usd: null as number | null, error: e instanceof RscError ? e.message : "Gagal ambil saldo RSC." }),
                )
                : Promise.resolve({ usd: null as number | null, error: null as string | null }),
        ]);

    const orders: AdminOrderRow[] = (ordersRaw ?? []).map((o) => ({
        id: o.id as string,
        code: o.order_code as string,
        username: "@" + (o.target_username as string),
        packageLabel: o.package_label as string,
        units: Number(o.units),
        total: Number(o.total),
        status: o.status as AdminStatus,
        time: o.created_at as string,
        rscOrderNumber: o.rsc_order_number === null || o.rsc_order_number === undefined ? null : Number(o.rsc_order_number),
        failReason: (o.fail_reason as string) ?? "",
    }));

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
            d.setDate(d.getDate() - i);
            const key = dayKey(d);
            out.push({ l: dayLabel(d), v: Math.round(((revenueByDay.get(key) ?? 0) / 1_000_000) * 10) / 10 });
        }
        return out;
    }

    const todayKey = dayKey(startOfToday);
    const yesterday = new Date(startOfToday);
    yesterday.setDate(yesterday.getDate() - 1);
    const yestKey = dayKey(yesterday);

    const todayOrders = ordersByDay.get(todayKey) ?? 0;
    const yesterdayOrders = ordersByDay.get(yestKey) ?? 0;
    const todayRevenue = revenueByDay.get(todayKey) ?? 0;
    const yesterdayRevenue = revenueByDay.get(yestKey) ?? 0;
    const usdIdrRate = Number(settings?.usd_idr_rate ?? 16300);

    return {
        isAdmin: true,
        rscBalanceIdr: rscBalanceResult.usd !== null ? Math.round(rscBalanceResult.usd * usdIdrRate) : null,
        rscConfigured,
        rscBalanceError: rscBalanceResult.error,
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

export async function updateUsdIdrRateAction(rate: number): Promise<{ error: string | null }> {
    if (!Number.isFinite(rate) || rate <= 0) return { error: "Kurs tidak valid." };
    const supabase = await createClient();
    const { error } = await supabase.from("app_settings").update({ usd_idr_rate: rate }).eq("id", true);
    if (error) return { error: "Gagal menyimpan kurs. Pastikan akun ini admin." };
    revalidatePath("/admin");
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
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    return { error: null };
}

export async function addStockAction(amount: number): Promise<{ error: string | null }> {
    if (!Number.isFinite(amount) || amount === 0) return { error: "Jumlah tidak valid." };
    const supabase = await createClient();
    const { data: current } = await supabase.from("app_settings").select("stars_stock").eq("id", true).maybeSingle();
    const next = Math.max(0, Number(current?.stars_stock ?? 0) + Math.round(amount));
    const { error } = await supabase.from("app_settings").update({ stars_stock: next }).eq("id", true);
    if (error) return { error: "Gagal update stok. Pastikan akun ini admin." };
    revalidatePath("/admin");
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
            "id, order_code, target_username, package_label, units, total, status, created_at, rsc_order_number, fail_reason",
        )
        .order("created_at", { ascending: false })
        .limit(1000);

    const orders: AdminOrderRow[] = (ordersRaw ?? []).map((o) => ({
        id: o.id as string,
        code: o.order_code as string,
        username: "@" + (o.target_username as string),
        packageLabel: o.package_label as string,
        units: Number(o.units),
        total: Number(o.total),
        status: o.status as AdminStatus,
        time: o.created_at as string,
        rscOrderNumber: o.rsc_order_number === null || o.rsc_order_number === undefined ? null : Number(o.rsc_order_number),
        failReason: (o.fail_reason as string) ?? "",
    }));

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
    revalidatePath("/admin");
    revalidatePath("/dashboard");
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
        const { error } = await supabase.rpc("admin_update_order_status", {
            p_order_id: orderId,
            p_status: mapRscStatus(rscOrder.status),
            p_reason: mapRscStatus(rscOrder.status) === "fail" ? `Status RSC: ${rscOrder.status}` : "",
        });
        if (error) return { error: "Gagal simpan status. Pastikan akun ini admin." };
        revalidatePath("/admin/pesanan");
        revalidatePath("/admin");
        revalidatePath("/dashboard");
        return { error: null };
    } catch (e) {
        return { error: e instanceof RscError ? e.message : "Gagal ambil status dari RSC." };
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
        return { isAdmin: false, adminEmail: "", usdIdrRate: 16300, stock: 0, rscConfigured: false };
    }
    const [{ data: auth }, { data: settings }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("app_settings").select("stars_stock, usd_idr_rate").eq("id", true).maybeSingle(),
    ]);
    return {
        isAdmin: true,
        adminEmail: auth.user?.email ?? "",
        usdIdrRate: Number(settings?.usd_idr_rate ?? 16300),
        stock: Number(settings?.stars_stock ?? 0),
        // Cuma kirim status ada/tidaknya ke client, TIDAK PERNAH kirim isi key-nya.
        rscConfigured: !!process.env.RSC_API_KEY,
    };
}