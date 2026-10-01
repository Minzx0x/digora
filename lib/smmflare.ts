// Klien server-only untuk API supplier SMM panel smmflare.com.
// PENTING: file ini HANYA boleh dipanggil dari kode server ("use server" actions,
// route handler, dst) — jangan pernah diimpor dari komponen client. API key
// disimpan sebagai env var biasa (SMMFLARE_API_KEY), TANPA prefix NEXT_PUBLIC_,
// supaya tidak pernah terkirim ke browser. Isi sendiri di .env.local, contoh:
//   SMMFLARE_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
// Beda dari RSC (REST, satu path per aksi), smmflare pakai satu endpoint yang
// sama buat semua aksi (POST ke /api/v2, dibedakan lewat field "action" di body)
// — pola umum "SMM Panel API" yang dipakai hampir semua provider sejenis.
// v1 dukung 2 tipe: "Default" (link + quantity biasa) dan "Custom Comments"
// (link + daftar komentar sendiri, 1 per baris -- "jumlah" dihitung dari
// banyak barisnya, lihat buy_smm_with_saldo di supabase/smm-custom-comments.sql).
// Tipe lain (Package, Mentions dengan hashtag, Subscriptions, dst) butuh field
// tambahan yang beda-beda lagi dan masih di luar scope. Varian "banyak
// sekaligus" (multi-order/mass order, multi refill status) SENGAJA belum
// diimplementasikan — nunggu fitur order massal ada dulu, baru relevan.

const SMMFLARE_BASE_URL = process.env.SMMFLARE_BASE_URL || "https://smmflare.com/api/v2";

class SmmflareError extends Error {
    constructor(
        message: string,
        public status?: number,
        public body?: unknown,
    ) {
        super(message);
        this.name = "SmmflareError";
    }
}

// Server smmflare kadang lambat/hang — tanpa batas ini, satu request yang macet
// bisa nge-block seluruh halaman admin yang nunggu Promise.all selesai.
const SMMFLARE_TIMEOUT_MS = 8000;

async function smmflareRequest(action: string, params?: Record<string, unknown>): Promise<unknown> {
    const apiKey = process.env.SMMFLARE_API_KEY;
    if (!apiKey) {
        throw new SmmflareError("SMMFLARE_API_KEY belum diisi di .env.local server.");
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SMMFLARE_TIMEOUT_MS);

    let res: Response;
    try {
        res = await fetch(SMMFLARE_BASE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ key: apiKey, action, ...params }),
            // Harga & status order supplier bisa berubah — jangan pernah dicache Next.js.
            cache: "no-store",
            signal: controller.signal,
        });
    } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
            throw new SmmflareError(`Layanan supplier tidak balas dalam ${SMMFLARE_TIMEOUT_MS / 1000} detik (timeout).`);
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }

    const text = await res.text();
    let json: unknown = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = text;
    }

    if (!res.ok) {
        const msg = extractErrorMessage(json) ?? `Layanan supplier balas status ${res.status}`;
        throw new SmmflareError(msg, res.status, json);
    }
    // smmflare balas 200 OK tapi taruh error di body ({"error": "..."}) buat
    // beberapa kegagalan (mis. saldo supplier habis, service tidak aktif) —
    // dicek juga di sini, bukan cuma lewat !res.ok.
    const bodyErr = extractErrorMessage(json);
    if (bodyErr) {
        throw new SmmflareError(bodyErr, res.status, json);
    }
    return json;
}

function extractErrorMessage(json: unknown): string | null {
    if (json && typeof json === "object" && !Array.isArray(json)) {
        const obj = json as Record<string, unknown>;
        for (const key of ["error", "message", "error_message"]) {
            if (typeof obj[key] === "string") return obj[key] as string;
        }
    }
    return null;
}

function toNum(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
    return null;
}

export type SmmServiceType = "Default" | "Custom Comments";

export type SmmflareService = {
    serviceId: number;
    name: string;
    type: SmmServiceType;
    category: string;
    rateUsd: number; // harga per 1000 unit (atau per 1000 komentar), dalam USD
    min: number;
    max: number;
    refill: boolean;
    cancel: boolean;
    dripfeed: boolean;
};

const SUPPORTED_TYPES: SmmServiceType[] = ["Default", "Custom Comments"];

/** Daftar layanan dari smmflare — cuma tipe yang didukung Digora (lihat SUPPORTED_TYPES) yang dikembalikan. */
export async function getSmmflareServices(): Promise<SmmflareService[]> {
    const json = await smmflareRequest("services");
    if (!Array.isArray(json)) {
        console.error("[smmflare] action=services balas format yang tidak dikenali:", JSON.stringify(json));
        throw new SmmflareError("Format daftar layanan dari supplier tidak dikenali — cek console server.");
    }
    const out: SmmflareService[] = [];
    for (const row of json) {
        if (!row || typeof row !== "object") continue;
        const r = row as Record<string, unknown>;
        if (!SUPPORTED_TYPES.includes(r.type as SmmServiceType)) continue;
        const serviceId = toNum(r.service);
        const rateUsd = toNum(r.rate);
        const min = toNum(r.min);
        const max = toNum(r.max);
        if (serviceId === null || rateUsd === null || min === null || max === null) continue;
        // Beberapa provider (termasuk smmflare) nyelipin baris "pemisah" murni
        // visual di antara layanan asli buat ngelompokkin tampilan di panel
        // mereka sendiri (mis. nama "---- Instagram Categories ----", rate
        // $9999, min=max=1) — bukan layanan sungguhan, jangan sampai ke-tambah.
        // Layanan bertipe Default/Custom Comments itu SELALU quantity fleksibel
        // (bukan paket tetap), jadi min===max di sini pasti bukan layanan nyata.
        if (min === max || rateUsd > 1000) continue;
        out.push({
            serviceId,
            name: typeof r.name === "string" ? r.name : `Service #${serviceId}`,
            type: r.type as SmmServiceType,
            category: typeof r.category === "string" ? r.category : "Lainnya",
            rateUsd,
            min,
            max,
            refill: r.refill === true,
            cancel: r.cancel === true,
            dripfeed: r.dripfeed === true,
        });
    }
    return out;
}

/**
 * Kirim satu pesanan SMM ke smmflare — akun kamu (smmflare) yang kepotong,
 * bukan Digora. Layanan tipe "Default" kirim quantity biasa; "Custom Comments"
 * kirim teks komentar (1 per baris) sebagai ganti quantity — smmflare yang
 * menghitung jumlahnya dari banyak baris di comments.
 */
export async function addSmmflareOrder(
    serviceId: number,
    link: string,
    opts: { quantity: number } | { comments: string },
): Promise<{ orderId: number }> {
    const params: Record<string, unknown> = { service: serviceId, link };
    if ("comments" in opts) {
        params.comments = opts.comments;
    } else {
        params.quantity = opts.quantity;
    }
    const json = await smmflareRequest("add", params);
    const obj = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
    const orderId = toNum(obj.order);
    if (orderId === null) {
        throw new SmmflareError("Respons buat order dari supplier tidak berisi nomor order yang valid.", undefined, json);
    }
    return { orderId };
}

export type SmmflareOrderStatus = {
    chargeUsd: number;
    startCount: number;
    status: string; // status mentah dari smmflare, mis. "Pending"/"In progress"/"Completed"/"Partial"/"Canceled"
    remains: number;
};

/** Cek status terbaru sebuah order smmflare (dipakai admin buat sinkron status manual). */
export async function getSmmflareOrderStatus(orderId: number): Promise<SmmflareOrderStatus> {
    const json = await smmflareRequest("status", { order: orderId });
    const obj = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
    return {
        chargeUsd: toNum(obj.charge) ?? 0,
        startCount: toNum(obj.start_count) ?? 0,
        status: typeof obj.status === "string" ? obj.status : "Pending",
        remains: toNum(obj.remains) ?? 0,
    };
}

/** Saldo akun smmflare (dalam USD) — dipakai buat kartu "Saldo Supplier" di admin. */
export async function getSmmflareBalanceUsd(): Promise<number> {
    const json = await smmflareRequest("balance");
    const obj = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
    const balance = toNum(obj.balance);
    if (balance === null) {
        console.error("[smmflare] action=balance balas format yang tidak dikenali:", JSON.stringify(json));
        throw new SmmflareError("Format respons saldo dari supplier tidak dikenali — cek console server.");
    }
    return balance;
}

/** Minta smmflare kirim ulang (refill) satu order yang enggagement-nya drop — order & harga TIDAK berubah, ini gratis dari sisi supplier. */
export async function refillSmmflareOrder(providerOrderId: number): Promise<{ refillId: number }> {
    const json = await smmflareRequest("refill", { order: providerOrderId });
    const obj = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
    const refillId = toNum(obj.refill);
    if (refillId === null) {
        throw new SmmflareError("Respons refill dari supplier tidak berisi ID refill yang valid.", undefined, json);
    }
    return { refillId };
}

/** Cek status refill yang sudah diminta sebelumnya (refillId dari refillSmmflareOrder). */
export async function getSmmflareRefillStatus(refillId: number): Promise<string> {
    const json = await smmflareRequest("refill_status", { refill: refillId });
    const obj = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
    return typeof obj.status === "string" ? obj.status : "Tidak diketahui";
}

/**
 * Batalkan satu order smmflare yang belum selesai — smmflare balas ARRAY (bahkan
 * buat 1 order), tiap baris {"order": N, "cancel": 1 | {"error": "..."}}. Beda
 * dari aksi lain yang balas object tunggal, jadi di-parse manual di sini.
 */
export async function cancelSmmflareOrder(providerOrderId: number): Promise<{ cancelled: boolean; error: string | null }> {
    const json = await smmflareRequest("cancel", { orders: String(providerOrderId) });
    const rows = Array.isArray(json) ? json : [json];
    const row = (rows.find((r) => r && typeof r === "object" && toNum((r as Record<string, unknown>).order) === providerOrderId) ??
        rows[0]) as Record<string, unknown> | undefined;
    const cancelField = row?.cancel;
    if (cancelField === 1 || cancelField === "1" || cancelField === true) {
        return { cancelled: true, error: null };
    }
    const err = extractErrorMessage(cancelField) ?? "Gagal membatalkan pesanan di supplier.";
    return { cancelled: false, error: err };
}

// Normalisasi status mentah smmflare ke status internal Digora (ok/proc/wait/fail).
// "Partial" dianggap "ok" (terkirim cukup) bukan "proc" — biar customer nggak
// nyangka pesanannya masih jalan padahal sudah macet di tengah jalan.
//
// "wait" TIDAK PERNAH dipetakan ke sini SAMA SEKALI (beda dari mapRscStatus) —
// "wait" di Digora artinya "Menunggu bayar" (customer belum bayar), sedangkan
// order SMM SELALU sudah dibayar (saldo kepotong sinkron) SEBELUM order-nya
// diteruskan ke smmflare sama sekali. "Pending" dari smmflare artinya "masih
// antre di supplier, belum diproses" -- itu tetap "Diproses" dari sudut
// pandang Digora, BUKAN "menunggu bayar". Sempat salah dipetakan ke "wait"
// dan bikin order yang udah lunas kelihatan seolah belum dibayar.
export function mapSmmflareStatus(rawStatus: string): "ok" | "proc" | "wait" | "fail" {
    const s = rawStatus.toLowerCase();
    if (["completed", "partial"].includes(s)) return "ok";
    if (["canceled", "cancelled", "refunded", "failed"].includes(s)) return "fail";
    return "proc"; // "pending", "in progress", "processing", dst
}

export { SmmflareError };
