// Klien server-only untuk payment gateway Paymenku (paymenku.com).
// PENTING: file ini HANYA boleh dipanggil dari kode server ("use server" actions,
// route handler webhook, dst) — jangan pernah diimpor dari komponen client.
// API key disimpan sebagai env var biasa (PAYMENKU_API_KEY), TANPA prefix
// NEXT_PUBLIC_, supaya tidak pernah terkirim ke browser. Isi sendiri di
// .env.local, contoh (isi dengan key ASLI dari dashboard Paymenku kamu —
// bentuk di bawah cuma placeholder, sengaja ditulis gak menyerupai format
// key asli manapun supaya gak ke-flag GitHub secret scanning sebagai key
// sungguhan):
//   PAYMENKU_API_KEY=<isi-api-key-dari-dashboard-paymenku>
//   PAYMENKU_WEBHOOK_SECRET=<isi-webhook-secret-dari-dashboard-paymenku>
//
// Base URL & path endpoint di bawah sudah dicocokkan ke docs.paymenku.com
// (bukan tebakan lagi) — base URL-nya "https://paymenku.com/api/v1" (BUKAN
// "api.paymenku.com", itu yang bikin 404 di percobaan pertama). Tapi
// dokumentasi mereka nge-load isi tabel parameter/response lewat JS, jadi
// nama-nama FIELD di body/response (channel_code persis apa, nama field QR
// string, dst) masih belum 100% pasti — bagian yang masih tebakan toleran
// (coba beberapa nama field alternatif) ditandai "⚠" di bawah. Kalau abis
// dites ada error field/validasi, kasih tau pesan errornya biar disesuaikan.

const PAYMENKU_BASE_URL = process.env.PAYMENKU_BASE_URL || "https://paymenku.com/api/v1";

class PaymenkuError extends Error {
    constructor(
        message: string,
        public status?: number,
        public body?: unknown,
    ) {
        super(message);
        this.name = "PaymenkuError";
    }
}

async function paymenkuRequest(path: string, init?: RequestInit): Promise<unknown> {
    const apiKey = process.env.PAYMENKU_API_KEY;
    if (!apiKey) {
        throw new PaymenkuError("PAYMENKU_API_KEY belum diisi di .env.local server.");
    }

    const res = await fetch(`${PAYMENKU_BASE_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
        cache: "no-store",
    });

    const text = await res.text();
    let json: unknown = null;
    try {
        json = text ? JSON.parse(text) : null;
    } catch {
        json = text;
    }

    if (!res.ok) {
        const msg = extractErrorMessage(json) ?? `Paymenku API ${path} balas status ${res.status}`;
        // "Validation failed" dkk itu cuma pesan generik — badan respons ASLINYA
        // (json, biasanya berisi field mana yang salah) dicatat lengkap di sini
        // supaya kelihatan di terminal server, karena itu satu-satunya cara
        // ketahuan field mana yang persisnya ditolak Paymenku.
        console.error(`[paymenku] ${path} balas ${res.status}:`, JSON.stringify(json));
        throw new PaymenkuError(msg, res.status, json);
    }
    return json;
}

function extractErrorMessage(json: unknown): string | null {
    if (json && typeof json === "object") {
        const obj = json as Record<string, unknown>;
        for (const key of ["message", "error", "error_message", "detail"]) {
            if (typeof obj[key] === "string") return obj[key] as string;
        }
        // Beberapa gateway taruh rincian per-field di bawah "errors"/"details"
        // (mis. { errors: { channel_code: ["wajib diisi"] } }) — kalau ada,
        // gabungkan jadi satu kalimat supaya lebih jelas dari sekadar "Validation failed".
        for (const key of ["errors", "details", "fields"]) {
            const nested = obj[key];
            if (nested && typeof nested === "object") {
                const parts: string[] = [];
                for (const [field, val] of Object.entries(nested as Record<string, unknown>)) {
                    const text = Array.isArray(val) ? val.join(", ") : String(val);
                    parts.push(`${field}: ${text}`);
                }
                if (parts.length > 0) {
                    const base = typeof obj.message === "string" ? obj.message : "Validasi gagal";
                    return `${base} (${parts.join("; ")})`;
                }
            }
        }
    }
    return null;
}

function pick(obj: Record<string, unknown>, keys: string[]): unknown {
    for (const k of keys) {
        if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return undefined;
}

function unwrap(json: unknown): Record<string, unknown> {
    if (!json || typeof json !== "object") return {};
    let obj = json as Record<string, unknown>;
    // beberapa gateway bungkus hasil di { data: {...} } atau { result: {...} }
    for (const key of ["data", "result", "transaction"]) {
        if (obj[key] && typeof obj[key] === "object") obj = obj[key] as Record<string, unknown>;
    }
    return obj;
}

// Channel code Paymenku itu HURUF KECIL dan per-provider spesifik (bukan
// grup generik kayak "EWALLET"/"VA") — dari contoh respons asli docs mereka:
// { code: "qris", ... }, { code: "dana", type: "ewallet", ... },
// { code: "bca_va", type: "va", ... }. Karena UI Digora cuma nawarin 3
// pilihan generik (qris/e-wallet/transfer bank), tiap grup untuk sementara
// diarahkan ke SATU provider representatif di bawah ini — "dana" buat
// e-wallet, "bca_va" buat transfer bank. Kalau nanti mau kasih pilihan
// provider lebih spesifik (DANA vs OVO vs ShopeePay, atau BCA vs BNI vs
// Mandiri), tinggal expand map ini + tambah pilihan di UI, gak perlu ubah
// kode lain. Paymenku juga punya endpoint buat list semua channel aktif
// (docs.paymenku.com/api/channels/payment-channels) kalau mau ambil daftarnya
// otomatis nanti.
export const PAYMENKU_CHANNEL_CODE: Record<string, string> = {
    qris: "qris",
    ewallet: "dana",
    bank: "bca_va",
};

export type PaymenkuTransaction = {
    trxId: string;
    referenceId: string;
    status: string; // status mentah dari Paymenku, mis. "pending" / "paid" / "failed" / "expired"
    payUrl: string; // link pembayaran (dibuka di tab baru) — kosong kalau gateway cuma kasih qrString
    qrString: string; // konten QRIS mentah untuk dirender jadi gambar QR di sisi client — kosong kalau bukan QRIS
};

function parseTransaction(json: unknown, fallbackReferenceId: string): PaymenkuTransaction {
    const obj = unwrap(json);
    const trxId = pick(obj, ["trx_id", "id", "transaction_id"]);
    const referenceId = pick(obj, ["reference_id", "ref_id", "external_id"]) ?? fallbackReferenceId;
    const status = pick(obj, ["status", "transaction_status"]) ?? "pending";
    const payUrl = pick(obj, ["pay_url", "payment_url", "checkout_url", "url"]) ?? "";
    const qrString = pick(obj, ["qr_string", "qris_string", "qr_content", "qr_code"]) ?? "";

    if (!trxId) {
        throw new PaymenkuError(
            "Respons create transaction Paymenku tidak berisi trx_id yang valid — cek console server untuk detail mentahnya.",
            undefined,
            json,
        );
    }

    return {
        trxId: String(trxId),
        referenceId: String(referenceId),
        status: String(status),
        payUrl: String(payUrl),
        qrString: String(qrString),
    };
}

/**
 * Bikin transaksi baru di Paymenku untuk satu pembayaran isi saldo.
 * amount dalam Rupiah (bukan sen). referenceId harus unik per transaksi
 * (dipakai buat mencocokkan balik saat webhook masuk).
 */
// Dipakai buat bikin return_url (halaman tempat user diarahkan balik setelah
// bayar, terutama buat e-wallet/VA yang lewat halaman checkout Paymenku dulu).
// Isi APP_URL di .env.local kalau domain produksi sudah ada, mis.
//   APP_URL=https://digora.id
// Kalau kosong, dianggap masih dites lokal.
const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function createPaymenkuTransaction(input: {
    referenceId: string;
    amount: number;
    channelCode: string;
    customerName: string;
    customerEmail?: string;
}): Promise<PaymenkuTransaction> {
    const json = await paymenkuRequest("/transaction/create", {
        method: "POST",
        headers: {
            // Docs Paymenku mensyaratkan header ini per transaksi (dipakai gateway
            // buat nolak request duplikat kalau kita retry) — pakai referenceId
            // kita sendiri karena itu memang unik per tagihan.
            "Idempotency-Key": input.referenceId,
        },
        body: JSON.stringify({
            reference_id: input.referenceId,
            channel_code: input.channelCode,
            amount: input.amount,
            customer_name: input.customerName,
            customer_email: input.customerEmail || undefined,
            // ⚠ Baru ketahuan dari error 422 percobaan pertama ("return_url":
            // ["validation.required"]) — WAJIB diisi. Diarahkan balik ke halaman
            // "Isi Saldo", tempat kartu QR/status pembayaran ada.
            return_url: `${APP_URL}/dashboard/saldo`,
        }),
    });
    return parseTransaction(json, input.referenceId);
}

/**
 * Cek status terbaru transaksi Paymenku (fallback kalau webhook belum/tidak
 * masuk). trxIdOrReferenceId boleh salah satu — docs Paymenku bilang endpoint
 * ini nerima trx_id ATAU reference_id di path yang sama.
 */
export async function getPaymenkuTransactionStatus(trxIdOrReferenceId: string): Promise<PaymenkuTransaction> {
    const json = await paymenkuRequest(`/check-status/${trxIdOrReferenceId}`, { method: "GET" });
    return parseTransaction(json, "");
}

// Normalisasi status mentah Paymenku ke 3 kondisi yang dipakai Digora.
export function mapPaymenkuStatus(status: string): "paid" | "failed" | "pending" {
    const s = status.toLowerCase();
    if (["paid", "success", "settled", "completed"].includes(s)) return "paid";
    if (["failed", "expired", "cancelled", "canceled", "declined"].includes(s)) return "failed";
    return "pending";
}

export type PaymenkuWebhookPayload = {
    referenceId: string;
    trxId: string;
    status: string;
};

/** Ekstrak reference_id/trx_id/status dari body webhook Paymenku (JSON yang sudah di-parse). */
export function parsePaymenkuWebhookPayload(json: unknown): PaymenkuWebhookPayload | null {
    const obj = unwrap(json);
    const referenceId = pick(obj, ["reference_id", "ref_id", "external_id"]);
    const trxId = pick(obj, ["trx_id", "id", "transaction_id"]);
    const status = pick(obj, ["status", "transaction_status"]);
    if (!referenceId) return null;
    return {
        referenceId: String(referenceId),
        trxId: trxId ? String(trxId) : "",
        status: status ? String(status) : "pending",
    };
}

/**
 * Verifikasi signature webhook Paymenku, sesuai contoh resmi di dashboard
 * Paymenku (menu Webhook → "Cara Verifikasi Signature"):
 *   expected = HMAC-SHA256(timestamp + "." + rawBody, PAYMENKU_WEBHOOK_SECRET)
 * dicocokkan ke header X-PaymenKu-Signature, dengan timestamp dari header
 * X-PaymenKu-Timestamp. KEDUA header itu wajib ada.
 */
export function verifyPaymenkuSignature(
    rawBody: string,
    signatureHeader: string | null,
    timestampHeader: string | null,
): boolean {
    const secret = process.env.PAYMENKU_WEBHOOK_SECRET;
    if (!secret) return false;
    if (!signatureHeader || !timestampHeader) return false;

    const crypto = require("node:crypto") as typeof import("node:crypto");
    const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestampHeader}.${rawBody}`)
        .digest("hex");

    // signature kadang dikirim dengan prefix "sha256=" — dukung dua-duanya
    const given = signatureHeader.replace(/^sha256=/i, "").trim().toLowerCase();

    if (given.length !== expected.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(given, "hex"), Buffer.from(expected, "hex"));
    } catch {
        return false;
    }
}

export { PaymenkuError };