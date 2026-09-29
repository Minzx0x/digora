"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { addSmmflareOrder } from "@/lib/smmflare";

export type SmmServiceRow = {
    id: string;
    providerServiceId: number;
    category: string;
    name: string;
    pricePer1000: number; // harga jual IDR per 1000 unit
    minQuantity: number;
    maxQuantity: number;
    refill: boolean;
    dripfeed: boolean;
};

export type SmmServiceEta = { avgMinutes: number | null; sampleSize: number };

// Estimasi selesai dari riwayat pesanan ASLI toko sendiri (bukan data dari
// smmflare — mereka nggak nyediain itu) — rata-rata durasi created_at s/d
// completed_at buat layanan ini, dari RPC get_smm_service_eta (SECURITY
// DEFINER, cuma balikin angka agregat, bukan data pesanan siapa pun).
// Baru mulai keisi begitu ada pesanan yang beneran selesai SETELAH kolom
// completed_at ada — layanan yang belum punya riwayat balik sampleSize:0.
export async function getSmmServiceEtaAction(serviceId: string): Promise<SmmServiceEta> {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_smm_service_eta", { p_service_id: serviceId });
    const row = Array.isArray(data) ? data[0] : data;
    const sampleSize = Number(row?.sample_size ?? 0);
    const avgMinutes = sampleSize > 0 && row?.avg_minutes !== null && row?.avg_minutes !== undefined ? Number(row.avg_minutes) : null;
    return { avgMinutes, sampleSize };
}

// Versi banyak sekaligus buat kolom "Estimasi" di /dashboard/daftar-layanan
// (bisa nampilin puluhan layanan sekaligus per halaman) — 1 query RPC, bukan
// manggil getSmmServiceEtaAction() satu-satu per baris. Layanan yang belum
// punya riwayat pesanan selesai TIDAK ikut balik dari RPC-nya, jadi di sini
// dilengkapi jadi {avgMinutes:null, sampleSize:0} biar tiap serviceId yang
// diminta selalu ada entrinya.
export async function getSmmServicesEtaAction(serviceIds: string[]): Promise<Record<string, SmmServiceEta>> {
    const out: Record<string, SmmServiceEta> = {};
    for (const id of serviceIds) out[id] = { avgMinutes: null, sampleSize: 0 };
    if (serviceIds.length === 0) return out;

    const supabase = await createClient();
    const { data } = await supabase.rpc("get_smm_services_eta", { p_service_ids: serviceIds });
    for (const row of data ?? []) {
        const id = row.service_id as string;
        const sampleSize = Number(row.sample_size ?? 0);
        out[id] = {
            sampleSize,
            avgMinutes: sampleSize > 0 && row.avg_minutes !== null && row.avg_minutes !== undefined ? Number(row.avg_minutes) : null,
        };
    }
    return out;
}

// Katalog SMM yang sudah dikurasi admin (lihat components/AdminSmmCatalog.tsx) —
// cuma yang active:true yang kelihatan di halaman beli. Tidak butuh login untuk
// baca (RLS: smm_services_select_all for select using (true), sama pola dengan
// packages_select_all).
//
// Supabase/PostgREST otomatis membatasi SETIAP select maksimal 1000 baris per
// permintaan — kalau admin aktifin banyak layanan sekaligus (lihat fitur "Tarik
// semua layanan smmflare" di admin), jumlahnya bisa lewat 1000. Di-loop pakai
// .range() biar beneran ambil SEMUA baris yang aktif, bukan cuma 1000 pertama.
export async function getSmmCatalog(): Promise<SmmServiceRow[]> {
    const supabase = await createClient();
    const PAGE = 1000;
    const rows: Record<string, unknown>[] = [];
    let from = 0;
    for (;;) {
        const { data, error } = await supabase
            .from("smm_services")
            .select("id, provider_service_id, category, name, price_per_1000, min_quantity, max_quantity, refill, dripfeed")
            .eq("active", true)
            .order("category", { ascending: true })
            .order("sort_order", { ascending: true })
            // Tiebreaker unik WAJIB ada — banyak baris berbagi sort_order yang
            // sama (default 0), tanpa ini urutan antar halaman .range() nggak
            // stabil dan bisa ke-ambil dobel (lihat komentar di atas fungsi ini).
            .order("id", { ascending: true })
            .range(from, from + PAGE - 1);
        // Kalau query gagal (mis. kolom belum ada karena migrasi SQL belum
        // dijalankan), JANGAN diam-diam dianggap "katalog kosong" — itu bikin
        // halaman customer kelihatan normal padahal sebenarnya error. Log biar
        // ketahuan dari terminal server.
        if (error) {
            console.error("[smm] getSmmCatalog gagal select smm_services:", error.message);
            break;
        }
        if (!data || data.length === 0) break;
        rows.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
    }

    return rows.map((s) => ({
        id: s.id as string,
        providerServiceId: Number(s.provider_service_id),
        category: s.category as string,
        name: s.name as string,
        pricePer1000: Number(s.price_per_1000),
        minQuantity: Number(s.min_quantity),
        maxQuantity: Number(s.max_quantity),
        refill: !!s.refill,
        dripfeed: !!s.dripfeed,
    }));
}

function friendlySmmDbError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("insufficient_balance")) return "Saldo tidak cukup.";
    if (m.includes("not_authenticated")) return "Sesi berakhir, silakan login lagi.";
    if (m.includes("invalid_amount")) return "Jumlah di luar batas minimal/maksimal layanan ini.";
    if (m.includes("service_not_found")) return "Layanan tidak ditemukan atau sudah tidak aktif.";
    if (m.includes("profile_not_found")) return "Profil tidak ditemukan. Coba login ulang.";
    return "Gagal memproses. Coba lagi.";
}

export async function buySmmOrderAction(input: {
    serviceId: string;
    targetLink: string;
    quantity: number;
}): Promise<{ error: string | null; orderCode?: string }> {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
        return { error: "Jumlah tidak valid." };
    }

    let link: string;
    try {
        const url = new URL(input.targetLink.trim());
        if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("bad_protocol");
        link = url.toString();
    } catch {
        return { error: "Link tidak valid. Pastikan diawali http:// atau https://" };
    }

    const supabase = await createClient();
    const quantity = Math.round(input.quantity);

    const { data, error } = await supabase.rpc("buy_smm_with_saldo", {
        p_service_id: input.serviceId,
        p_target_link: link,
        p_quantity: quantity,
    });
    if (error) {
        // Pesan asli dari RPC sebelumnya TIDAK PERNAH kelogging di sini sama
        // sekali — kalau errornya nggak kena salah satu pola di
        // friendlySmmDbError, satu-satunya cara tau penyebab aslinya ya dari
        // sini (server-side, nggak pernah dikirim balik ke customer).
        console.error("[smm-order] buy_smm_with_saldo gagal:", error.message, JSON.stringify(error));
        return { error: friendlySmmDbError(error.message) };
    }

    const order = data as { id?: string; order_code?: string } | null;

    // Saldo Digora sudah terpotong dan order tercatat. Sekarang teruskan ke
    // smmflare supaya layanannya benar-benar dikirim — kalau smmflare menolak
    // (mis. saldo supplier habis), order ini otomatis ditandai gagal dan saldo
    // pembeli di Digora dikembalikan lagi lewat sync_smm_order_from_provider.
    // Kalau SMMFLARE_API_KEY belum diisi sama sekali, langkah ini dilewati
    // (order tetap "Diproses") supaya tidak mem-blokir dev/testing.
    if (order?.id && process.env.SMMFLARE_API_KEY) {
        try {
            const { data: serviceRow } = await supabase
                .from("smm_services")
                .select("provider_service_id")
                .eq("id", input.serviceId)
                .maybeSingle();
            const providerServiceId = Number(serviceRow?.provider_service_id);
            if (!providerServiceId) throw new Error("provider_service_id_missing");

            const smmOrder = await addSmmflareOrder(providerServiceId, link, quantity);
            await supabase.rpc("sync_smm_order_from_provider", {
                p_order_id: order.id,
                p_provider_order_id: smmOrder.orderId,
                p_provider_status: "Pending",
                p_new_status: "proc",
                p_reason: "",
            });
        } catch (e) {
            // Detail teknisnya HANYA ke terminal server — fail_reason ini kesimpan
            // di DB dan ditampilkan balik ke PEMBELI di riwayat pesanannya sendiri,
            // jadi harus teks yang aman dibaca customer, bukan pesan debug internal.
            console.error("[smm-order] gagal teruskan ke supplier:", e instanceof Error ? e.message : e);
            const customerReason = "Pesanan gagal diproses. Saldo sudah dikembalikan.";
            await supabase.rpc("sync_smm_order_from_provider", {
                p_order_id: order.id,
                p_provider_order_id: null,
                p_provider_status: "failed",
                p_new_status: "fail",
                p_reason: customerReason,
            });
            revalidatePath("/dashboard", "layout");
            return { error: customerReason };
        }
    }

    revalidatePath("/dashboard", "layout");
    return { error: null, orderCode: order?.order_code };
}
