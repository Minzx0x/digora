"use server";

import { requireAdmin } from "@/lib/actions/admin";
import type { AdminStatus } from "@/lib/actions/admin";

export type StatsRange = "7d" | "30d" | "month" | "lastMonth" | "all";

export type TrendPoint = { label: string; deposit: number; revenue: number; orders: number };
export type StatusBreakdownRow = { status: AdminStatus; label: string; count: number; pct: number };
export type KindBreakdownRow = { kind: string; label: string; count: number; revenue: number; pct: number };

export type AdminStatsData = {
    isAdmin: boolean;
    range: StatsRange;
    trend: TrendPoint[];
    totals: { deposit: number; revenue: number; orders: number; newUsers: number };
    statusBreakdown: StatusBreakdownRow[];
    kindBreakdown: KindBreakdownRow[];
};

const STATUS_LABEL: Record<AdminStatus, string> = {
    ok: "Selesai",
    proc: "Diproses",
    wait: "Menunggu bayar",
    fail: "Gagal",
};

const KIND_LABEL: Record<string, string> = {
    stars: "Telegram Stars",
    premium: "Telegram Premium",
    smm: "SMM Panel",
};

const EMPTY: AdminStatsData = {
    isAdmin: false,
    range: "7d",
    trend: [],
    totals: { deposit: 0, revenue: 0, orders: 0, newUsers: 0 },
    statusBreakdown: [],
    kindBreakdown: [],
};

// Supabase/PostgREST otomatis membatasi SETIAP select maksimal 1000 baris per
// permintaan — kejadian nyata sebelumnya di fitur SMM (katalog kelihatan cuma
// 1000 padahal lebih). Di sini juga wajib di-paginate, soalnya toko yang udah
// jalan lama bisa punya order/deposit lebih dari 1000 baris di rentang "Sepanjang
// Waktu". WAJIB di-order pakai kolom unik (id) biar urutan antar halaman .range()
// stabil (tanpa itu, satu baris bisa ke-ambil dobel/ke-skip antar halaman).
async function fetchAllRows(
    supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
    table: string,
    columns: string,
    lt: string,
    gte: string | null,
): Promise<Record<string, unknown>[]> {
    const PAGE = 1000;
    const out: Record<string, unknown>[] = [];
    let from = 0;
    for (;;) {
        let q = supabase.from(table).select(columns).lt("created_at", lt).order("id", { ascending: true }).range(from, from + PAGE - 1);
        if (gte) q = q.gte("created_at", gte);
        const { data, error } = await q;
        if (error) {
            console.error(`[admin-stats] gagal select ${table}:`, error.message);
            break;
        }
        if (!data || data.length === 0) break;
        out.push(...(data as unknown as Record<string, unknown>[]));
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return out;
}

function getRangeBounds(range: StatsRange, now: Date): { start: Date | null; end: Date } {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (range === "7d") {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 6);
        return { start: d, end: now };
    }
    if (range === "30d") {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 29);
        return { start: d, end: now };
    }
    if (range === "month") {
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    }
    if (range === "lastMonth") {
        return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 1) };
    }
    return { start: null, end: now };
}

function dayKey(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function dayLabel(d: Date): string {
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function monthKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date): string {
    return d.toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

// Bucket harian buat 7 Hari/30 Hari/Bulan Ini/Bulan Lalu, bucket BULANAN buat
// Sepanjang Waktu — kalau toko udah jalan berbulan-bulan, grafik per-hari bakal
// jadi ratusan titik yang nggak kebaca lagi.
function buildBuckets(range: StatsRange, start: Date | null, end: Date, earliestData: Date | null): { key: string; label: string }[] {
    const out: { key: string; label: string }[] = [];
    if (range === "all") {
        const from = earliestData ?? end;
        const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
        const last = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cursor <= last) {
            out.push({ key: monthKey(cursor), label: monthLabel(cursor) });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return out.length > 0 ? out : [{ key: monthKey(end), label: monthLabel(end) }];
    }
    const from = start ?? end;
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor <= last) {
        out.push({ key: dayKey(cursor), label: dayLabel(cursor) });
        cursor.setDate(cursor.getDate() + 1);
    }
    return out;
}

// Halaman /admin/statistik: tren Deposit/Revenue/Order + breakdown status &
// jenis produk. "Komisi" dari referensi SENGAJA tidak ada — Digora belum
// punya sistem referral/affiliate sama sekali.
export async function getAdminStatsData(range: StatsRange): Promise<AdminStatsData> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { ...EMPTY, range };

    const now = new Date();
    const { start, end } = getRangeBounds(range, now);
    const startIso = start ? start.toISOString() : null;
    const endIso = end.toISOString();

    const [ordersRaw, depositsRaw, profilesRaw] = await Promise.all([
        fetchAllRows(supabase, "orders", "kind, total, status, created_at", endIso, startIso),
        fetchAllRows(supabase, "deposits", "amount, status, created_at", endIso, startIso),
        fetchAllRows(supabase, "profiles", "created_at", endIso, startIso),
    ]);

    // Buat "Sepanjang Waktu", perlu tau data paling lama biar bucket bulanannya
    // nggak dimulai dari tanggal yang salah (mis. cuma dari bulan ini padahal
      // ada order dari bulan-bulan sebelumnya).
    let earliest: Date | null = null;
    for (const o of ordersRaw) {
        const d = new Date(o.created_at as string);
        if (!earliest || d < earliest) earliest = d;
    }
    for (const d0 of depositsRaw) {
        const d = new Date(d0.created_at as string);
        if (!earliest || d < earliest) earliest = d;
    }

    const buckets = buildBuckets(range, start, end, earliest);
    const keyOf = range === "all" ? monthKey : dayKey;

    const byBucket = new Map<string, { deposit: number; revenue: number; orders: number }>();
    for (const b of buckets) byBucket.set(b.key, { deposit: 0, revenue: 0, orders: 0 });

    let totalOrders = 0;
    let totalRevenue = 0;
    const statusCount: Record<AdminStatus, number> = { ok: 0, proc: 0, wait: 0, fail: 0 };
    const kindCount = new Map<string, number>();
    const kindRevenue = new Map<string, number>();

    // PENTING: "Total pesanan"/tren "Pesanan"/Breakdown jenis produk cuma
    // ngitung pesanan yang BENERAN SELESAI (status 'ok') — sama kayak Revenue
    // & Deposit yang emang dari dulu udah cuma ngitung yang berhasil. Pesanan
    // gagal/masih diproses/nunggu bayar TIDAK ikut nambah angka-angka itu,
    // biar nggak bikin performa kelihatan lebih tinggi dari yang sebenarnya.
    // Satu-satunya tempat status gagal/dll memang SENGAJA dihitung adalah
    // "Breakdown Status Pesanan" — itu tujuannya justru buat nunjukin berapa
    // banyak yang gagal/pending, jadi totalOrdersAll (semua status) dipisah
    // sebagai penyebut persennya sendiri.
    let totalOrdersAll = 0;
    for (const o of ordersRaw) {
        const created = new Date(o.created_at as string);
        const key = keyOf(created);
        const bucket = byBucket.get(key);
        const total = Number(o.total ?? 0);
        const status = o.status as AdminStatus;
        const kind = (o.kind as string) ?? "lainnya";

        totalOrdersAll += 1;
        if (status in statusCount) statusCount[status] += 1;

        if (status === "ok") {
            totalOrders += 1;
            totalRevenue += total;
            if (bucket) {
                bucket.orders += 1;
                bucket.revenue += total;
            }
            kindCount.set(kind, (kindCount.get(kind) ?? 0) + 1);
            kindRevenue.set(kind, (kindRevenue.get(kind) ?? 0) + total);
        }
    }

    let totalDeposit = 0;
    for (const d of depositsRaw) {
        if (d.status !== "paid") continue;
        const created = new Date(d.created_at as string);
        const key = keyOf(created);
        const bucket = byBucket.get(key);
        const amount = Number(d.amount ?? 0);
        totalDeposit += amount;
        if (bucket) bucket.deposit += amount;
    }

    const trend: TrendPoint[] = buckets.map((b) => ({
        label: b.label,
        deposit: byBucket.get(b.key)?.deposit ?? 0,
        revenue: byBucket.get(b.key)?.revenue ?? 0,
        orders: byBucket.get(b.key)?.orders ?? 0,
    }));

    const statusBreakdown: StatusBreakdownRow[] = (Object.keys(statusCount) as AdminStatus[]).map((status) => ({
        status,
        label: STATUS_LABEL[status],
        count: statusCount[status],
        pct: totalOrdersAll > 0 ? Math.round((statusCount[status] / totalOrdersAll) * 100) : 0,
    }));

    const kindBreakdown: KindBreakdownRow[] = [...kindCount.entries()]
        .map(([kind, count]) => ({
            kind,
            label: KIND_LABEL[kind] ?? kind,
            count,
            revenue: kindRevenue.get(kind) ?? 0,
            pct: totalOrders > 0 ? Math.round((count / totalOrders) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

    return {
        isAdmin: true,
        range,
        trend,
        totals: { deposit: totalDeposit, revenue: totalRevenue, orders: totalOrders, newUsers: profilesRaw.length },
        statusBreakdown,
        kindBreakdown,
    };
}
