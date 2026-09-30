"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin";
import { getSmmflareServices, getSmmflareBalanceUsd, SmmflareError, type SmmflareService } from "@/lib/smmflare";

export type SmmAdminServiceRow = {
    id: string;
    providerServiceId: number;
    category: string;
    name: string;
    costPricePer1000: number;
    marginPercent: number;
    pricePer1000: number;
    minQuantity: number;
    maxQuantity: number;
    active: boolean;
};

export type SmmAdminData = {
    isAdmin: boolean;
    usdIdrRate: number;
    services: SmmAdminServiceRow[];
};

// Supabase/PostgREST otomatis membatasi SETIAP select maksimal 1000 baris per
// permintaan, walau tabelnya diisi ribuan (kejadian nyata: setelah "Tarik semua
// layanan smmflare", katalog kelihatannya cuma 1000 padahal aslinya lebih).
// Helper ini nge-loop pakai .range() sampai habis, biar select apa pun di file
// ini beneran ambil SEMUA baris, bukan cuma 1000 pertama.
//
// PENTING: WAJIB di-order pakai kolom unik (id) — tanpa ORDER BY yang unik,
// Postgres nggak menjamin urutan baris tetap sama antar query .range() yang
// berturut-turut, jadi satu baris bisa ke-ambil dobel di halaman berbeda
// sementara baris lain malah ke-skip (kejadian nyata: dropdown "Layanan" di
// customer error "duplicate key" gara-gara ini, waktu banyak baris punya
// sort_order yang sama-sama 0).
async function fetchAllRows(
    supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
    table: string,
    columns: string,
): Promise<Record<string, unknown>[]> {
    const PAGE = 1000;
    const out: Record<string, unknown>[] = [];
    let from = 0;
    for (;;) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .order("id", { ascending: true })
            .range(from, from + PAGE - 1);
        if (error) console.error(`[admin-smm] fetchAllRows gagal select ${table}:`, error.message);
        if (error || !data || data.length === 0) break;
        out.push(...(data as unknown as Record<string, unknown>[]));
        if (data.length < PAGE) break;
        from += PAGE;
    }
    return out;
}

// Halaman /admin/smm: HANYA kurasi katalog (cari&tambah, atur markup, toggle
// aktif) — daftar pesanan SMM sudah otomatis kegabung di /admin/pesanan
// (lihat lib/actions/admin.ts getAllOrdersData), tidak diulang di sini.
export async function getSmmAdminData(): Promise<SmmAdminData> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { isAdmin: false, usdIdrRate: 16300, services: [] };

    const [{ data: settings }, servicesRaw] = await Promise.all([
        supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle(),
        fetchAllRows(
            supabase,
            "smm_services",
            "id, provider_service_id, category, name, cost_price_per_1000, margin_percent, price_per_1000, min_quantity, max_quantity, active, sort_order",
        ),
    ]);
    servicesRaw.sort((a, b) => {
        const catCmp = String(a.category).localeCompare(String(b.category));
        if (catCmp !== 0) return catCmp;
        return Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0);
    });

    const services: SmmAdminServiceRow[] = servicesRaw.map((s) => ({
        id: s.id as string,
        providerServiceId: Number(s.provider_service_id),
        category: s.category as string,
        name: s.name as string,
        costPricePer1000: Number(s.cost_price_per_1000 ?? 0),
        marginPercent: Number(s.margin_percent ?? 0),
        pricePer1000: Number(s.price_per_1000 ?? 0),
        minQuantity: Number(s.min_quantity),
        maxQuantity: Number(s.max_quantity),
        active: !!s.active,
    }));

    return { isAdmin: true, usdIdrRate: Number(settings?.usd_idr_rate ?? 16300), services };
}

// smmflare bisa punya ribuan layanan — nggak pernah disimpan mentah-mentah ke
// DB. Ini cuma cari LIVE ke daftar mereka, dibatasi ~200 hasil biar payload-nya
// nggak kebesaran, admin baru pilih mana yang mau "ditambah" ke katalog kurasi.
export async function searchSmmflareServicesAction(
    query: string,
): Promise<{ error: string | null; results: SmmflareService[] }> {
    const { ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin.", results: [] };

    try {
        const all = await getSmmflareServices();
        const q = query.trim().toLowerCase();
        // Query angka murni (mis. "11034") ditujukan buat cari service ID
        // persis, bukan cocokin sebagian teks nama/kategori — beda dari
        // pencarian kata kunci biasa di bawah.
        const filtered = !q
            ? all
            : /^\d+$/.test(q)
              ? all.filter((s) => String(s.serviceId) === q)
              : all.filter((s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
        return { error: null, results: filtered.slice(0, 200) };
    } catch (e) {
        return { error: e instanceof SmmflareError ? e.message : "Gagal ambil daftar layanan dari supplier.", results: [] };
    }
}

// Impor SEMUA layanan bertipe "Default" dari smmflare (bukan cuma hasil satu
// kata kunci pencarian) langsung dalam status aktif. Yang provider_service_id-nya
// sudah ada di katalog TIDAK disentuh/ditimpa (biar modal/markup yang sudah
// diubah admin nggak ke-reset balik ke default) — cuma yang belum ada yang
// ditambah. Insert di-batch 500 baris sekali jalan biar aman kalau jumlahnya
// ribuan (satu payload/request kegedean bisa timeout/ditolak Supabase).
export async function importAllSmmflareServicesAction(): Promise<{ error: string | null; imported: number }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin.", imported: 0 };

    try {
        const all = await getSmmflareServices();
        const existing = await fetchAllRows(supabase, "smm_services", "provider_service_id");
        const existingIds = new Set(existing.map((r) => Number(r.provider_service_id)));
        const toInsert = all.filter((s) => !existingIds.has(s.serviceId));
        if (toInsert.length === 0) return { error: null, imported: 0 };

        const { data: settings } = await supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle();
        const usdIdrRate = Number(settings?.usd_idr_rate ?? 16300);

        const rows = toInsert.map((s) => ({
            provider_service_id: s.serviceId,
            category: s.category,
            name: s.name,
            cost_price_per_1000: Math.round(s.rateUsd * usdIdrRate),
            margin_percent: 20,
            min_quantity: s.min,
            max_quantity: s.max,
            active: true,
            refill: s.refill,
            dripfeed: s.dripfeed,
        }));

        const BATCH = 500;
        let imported = 0;
        for (let i = 0; i < rows.length; i += BATCH) {
            const { error } = await supabase.from("smm_services").insert(rows.slice(i, i + BATCH));
            if (error) return { error: `Gagal impor sebagian (baru ${imported} tersimpan): ${error.message}`, imported };
            imported += rows.slice(i, i + BATCH).length;
        }

        revalidatePath("/admin", "layout");
        revalidatePath("/dashboard", "layout");
        return { error: null, imported };
    } catch (e) {
        return { error: e instanceof SmmflareError ? e.message : "Gagal ambil daftar layanan dari supplier.", imported: 0 };
    }
}

export async function addSmmServiceAction(input: {
    providerServiceId: number;
    category: string;
    name: string;
    rateUsd: number;
    minQuantity: number;
    maxQuantity: number;
    refill?: boolean;
    dripfeed?: boolean;
    // Default nonaktif (admin review dulu sebelum ke pelanggan) — dikasih opsi
    // aktifkan langsung buat kasus "tambah & aktifkan semua hasil pencarian".
    active?: boolean;
}): Promise<{ error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };

    const { data: settings } = await supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle();
    const usdIdrRate = Number(settings?.usd_idr_rate ?? 16300);
    const costPricePer1000 = Math.round(input.rateUsd * usdIdrRate);

    const { error } = await supabase.from("smm_services").insert({
        provider_service_id: input.providerServiceId,
        category: input.category,
        name: input.name,
        cost_price_per_1000: costPricePer1000,
        margin_percent: 20,
        min_quantity: input.minQuantity,
        max_quantity: input.maxQuantity,
        active: input.active ?? false,
        refill: input.refill ?? false,
        dripfeed: input.dripfeed ?? false,
    });
    if (error) {
        if (error.message.toLowerCase().includes("duplicate")) return { error: "Layanan ini sudah ada di katalog." };
        return { error: "Gagal menambah layanan. Pastikan akun ini admin." };
    }
    revalidatePath("/admin", "layout");
    return { error: null };
}

// Tarik ulang rate/min/max terbaru satu layanan yang sudah ditambah — mirror
// "Sync modal dari RSC" di halaman Paket & Harga, tapi per-baris (bukan sekaligus
// semua katalog, karena skalanya beda jauh dari ~10-20 tier Telegram).
export async function refreshSmmServiceRateAction(id: string): Promise<{ error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };

    const { data: row } = await supabase.from("smm_services").select("provider_service_id").eq("id", id).maybeSingle();
    if (!row) return { error: "Layanan tidak ditemukan." };

    try {
        const all = await getSmmflareServices();
        const match = all.find((s) => s.serviceId === Number(row.provider_service_id));
        if (!match) return { error: "Layanan ini sudah tidak ada di daftar supplier (mungkin dihapus/diganti tipe)." };

        const { data: settings } = await supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle();
        const usdIdrRate = Number(settings?.usd_idr_rate ?? 16300);

        const { error } = await supabase
            .from("smm_services")
            .update({
                name: match.name,
                category: match.category,
                cost_price_per_1000: Math.round(match.rateUsd * usdIdrRate),
                min_quantity: match.min,
                max_quantity: match.max,
                refill: match.refill,
                dripfeed: match.dripfeed,
            })
            .eq("id", id);
        if (error) return { error: "Gagal update. Pastikan akun ini admin." };
        revalidatePath("/admin", "layout");
        return { error: null };
    } catch (e) {
        return { error: e instanceof SmmflareError ? e.message : "Gagal ambil data dari supplier." };
    }
}

export async function toggleSmmServiceActiveAction(id: string, active: boolean): Promise<{ error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };
    const { error } = await supabase.from("smm_services").update({ active }).eq("id", id);
    if (error) return { error: "Gagal menyimpan. Pastikan akun ini admin." };
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}

// Harga jual (price_per_1000) TIDAK diset langsung — dihitung server-side
// (trigger di Postgres, lihat supabase/smm.sql) dari modal x markup, sama pola
// dengan updatePackageCostAction.
export async function updateSmmServiceMarginAction(
    id: string,
    costPricePer1000: number,
    marginPercent: number,
): Promise<{ error: string | null }> {
    if (!Number.isFinite(costPricePer1000) || costPricePer1000 < 0) return { error: "Modal tidak valid." };
    if (!Number.isFinite(marginPercent) || marginPercent < 0) return { error: "Markup tidak valid." };
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };
    const { error } = await supabase
        .from("smm_services")
        .update({ cost_price_per_1000: costPricePer1000, margin_percent: marginPercent })
        .eq("id", id);
    if (error) return { error: "Gagal menyimpan. Pastikan akun ini admin." };
    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");
    return { error: null };
}

export type SmmflareBalanceInfo = {
    balanceIdr: number | null;
    configured: boolean;
    error: string | null;
};

// Sama pola dengan getRscBalance() — best-effort, dipisah biar lambat/hang-nya
// API smmflare cuma bikin kartu saldo ini yang nunggu (lihat SmmflareBalanceCard.tsx).
export async function getSmmflareBalance(usdIdrRate: number): Promise<SmmflareBalanceInfo> {
    const configured = !!process.env.SMMFLARE_API_KEY;
    if (!configured) return { balanceIdr: null, configured: false, error: null };

    try {
        const usd = await getSmmflareBalanceUsd();
        return { balanceIdr: Math.round(usd * usdIdrRate), configured: true, error: null };
    } catch (e) {
        console.error("[admin-smm] gagal ambil saldo supplier:", e instanceof Error ? e.message : e);
        return { balanceIdr: null, configured: true, error: e instanceof SmmflareError ? e.message : "Gagal ambil saldo supplier." };
    }
}
