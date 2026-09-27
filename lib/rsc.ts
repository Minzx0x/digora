// Klien server-only untuk API supplier RSC (resell.codes).
// PENTING: file ini HANYA boleh dipanggil dari kode server ("use server" actions,
// route handler, dst) — jangan pernah diimpor dari komponen client. API key
// disimpan sebagai env var biasa (RSC_API_KEY), TANPA prefix NEXT_PUBLIC_, supaya
// tidak pernah terkirim ke browser. Isi sendiri di .env.local, contoh:
//   RSC_API_KEY=rsc_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
//
// Kita HANYA memakai endpoint di bawah namespace /telegram — kategori lain di
// RSC (gift cards, top-up game, Steam, dll) sengaja tidak disentuh sama sekali,
// sesuai permintaan: "ambil telegram doang".

const RSC_BASE_URL = process.env.RSC_BASE_URL || "https://resell.codes/api/v1";

class RscError extends Error {
    constructor(
        message: string,
        public status?: number,
        public body?: unknown,
    ) {
        super(message);
        this.name = "RscError";
    }
}

async function rscRequest(path: string, init?: RequestInit): Promise<unknown> {
    const apiKey = process.env.RSC_API_KEY;
    if (!apiKey) {
        throw new RscError("RSC_API_KEY belum diisi di .env.local server.");
    }

    const res = await fetch(`${RSC_BASE_URL}${path}`, {
        ...init,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
            ...(init?.body ? { "Content-Type": "application/json" } : {}),
            ...init?.headers,
        },
        // Data harga & status order supplier bisa berubah — jangan pernah dicache Next.js.
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
        const msg = extractErrorMessage(json) ?? `RSC API ${path} balas status ${res.status}`;
        throw new RscError(msg, res.status, json);
    }
    return json;
}

function extractErrorMessage(json: unknown): string | null {
    if (json && typeof json === "object") {
        const obj = json as Record<string, unknown>;
        for (const key of ["message", "error", "error_message", "detail"]) {
            if (typeof obj[key] === "string") return obj[key] as string;
        }
    }
    return null;
}

async function rscGet(path: string): Promise<unknown> {
    return rscRequest(path, { method: "GET" });
}

async function rscPost(path: string, body: unknown): Promise<unknown> {
    return rscRequest(path, { method: "POST", body: JSON.stringify(body) });
}

/** Harga live Telegram Stars dari RSC, dalam USD per 1 Star. */
export async function getRscStarsRateUsd(): Promise<number> {
    const json = await rscGet("/telegram/stars");
    const rate = extractUsdPerStar(json);
    if (rate === null) {
        throw new RscError(
            "Format respons GET /telegram/stars dari RSC tidak dikenali — cek console server untuk detail mentahnya.",
            undefined,
            json,
        );
    }
    return rate;
}

/** Harga live Telegram Premium dari RSC, per paket bulan (3/6/12) -> USD. */
export async function getRscPremiumRatesUsd(): Promise<Record<number, number>> {
    const json = await rscGet("/telegram/premium");
    const rates = extractPremiumRatesUsd(json);
    if (!rates || Object.keys(rates).length === 0) {
        throw new RscError(
            "Format respons GET /telegram/premium dari RSC tidak dikenali — cek console server untuk detail mentahnya.",
            undefined,
            json,
        );
    }
    return rates;
}

function toNum(v: unknown): number | null {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
    return null;
}

// Coba beberapa bentuk respons yang mungkin dipakai RSC untuk /telegram/stars:
// - { price_usd: "0.0153" } / { rate_usd } / { usd_per_star } langsung per-unit
// - { stars: [{ quantity, charged_usd }, ...] } atau array biasa -> pakai tier
//   terbesar untuk perkiraan rate per-unit paling akurat (biasanya makin banyak
//   makin murah per unit, tapi ini cukup buat modal awal; nanti tetap bisa
//   diedit manual oleh admin di dashboard).
function extractUsdPerStar(json: unknown): number | null {
    if (json && typeof json === "object" && !Array.isArray(json)) {
        const obj = json as Record<string, unknown>;
        for (const key of ["price_usd", "rate_usd", "usd_per_star", "per_star_usd"]) {
            const n = toNum(obj[key]);
            if (n !== null) return n;
        }
        // { data: {...} } atau { stars: {...} } wrapper
        for (const key of ["data", "stars", "result"]) {
            if (obj[key] !== undefined) {
                const nested = extractUsdPerStar(obj[key]);
                if (nested !== null) return nested;
            }
        }
    }
    if (Array.isArray(json) && json.length > 0) {
        const rates = json
            .map((row) => {
                if (!row || typeof row !== "object") return null;
                const r = row as Record<string, unknown>;
                const qty = toNum(r.quantity) ?? toNum(r.stars) ?? toNum(r.amount);
                const usd = toNum(r.charged_usd) ?? toNum(r.price_usd) ?? toNum(r.usd);
                if (qty && usd && qty > 0) return usd / qty;
                return null;
            })
            .filter((n): n is number => n !== null);
        if (rates.length > 0) return rates[rates.length - 1];
    }
    return null;
}

// Coba beberapa bentuk respons untuk /telegram/premium: array [{months, price_usd}]
// atau object { "3": price, "6": price, "12": price } / { plans: [...] }.
function extractPremiumRatesUsd(json: unknown): Record<number, number> | null {
    const out: Record<number, number> = {};

    if (Array.isArray(json)) {
        for (const row of json) {
            if (!row || typeof row !== "object") continue;
            const r = row as Record<string, unknown>;
            const months = toNum(r.months) ?? toNum(r.month) ?? toNum(r.duration);
            const usd = toNum(r.price_usd) ?? toNum(r.charged_usd) ?? toNum(r.usd);
            if (months && usd) out[months] = usd;
        }
    } else if (json && typeof json === "object") {
        const obj = json as Record<string, unknown>;
        if (Array.isArray(obj.plans)) return extractPremiumRatesUsd(obj.plans);
        if (obj.data !== undefined) return extractPremiumRatesUsd(obj.data);
        for (const key of ["3", "6", "12"]) {
            const n = toNum(obj[key]);
            if (n !== null) out[Number(key)] = n;
        }
    }

    return Object.keys(out).length > 0 ? out : null;
}

// Saldo akun RSC (dalam USD) — dipakai buat gantiin "stok Stars" manual di
// Ringkasan admin dengan angka asli: berapa dana yang masih tersisa di akun
// RSC buat nerusin pesanan Stars/Premium ke pelanggan. Kalau format respons
// GET /me berubah dari dugaan di bawah, isi mentahnya di-log ke terminal
// server (console.error) biar gampang dicocokkan manual.
export async function getRscBalanceUsd(): Promise<number> {
    const json = await rscGet("/me");
    const balance = extractBalanceUsd(json);
    if (balance === null) {
        console.error("[rsc] GET /me balas format yang tidak dikenali:", JSON.stringify(json));
        throw new RscError(
            "Format respons GET /me dari RSC tidak dikenali — cek console server untuk detail mentahnya.",
            undefined,
            json,
        );
    }
    return balance;
}

function extractBalanceUsd(json: unknown): number | null {
    if (json && typeof json === "object" && !Array.isArray(json)) {
        const obj = json as Record<string, unknown>;
        for (const key of ["balance_usd", "balance", "balanceUsd", "usd_balance"]) {
            const n = toNum(obj[key]);
            if (n !== null) return n;
        }
        for (const key of ["data", "account", "result"]) {
            if (obj[key] !== undefined) {
                const nested = extractBalanceUsd(obj[key]);
                if (nested !== null) return nested;
            }
        }
    }
    return null;
}

export type RscOrder = {
    number: number;
    status: string; // status mentah dari RSC, mis. "processing" / "completed" / "failed"
};

function parseRscOrder(json: unknown): RscOrder {
    const obj = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
    const number = toNum(obj.number) ?? toNum(obj.id);
    const status = typeof obj.status === "string" ? obj.status : "processing";
    if (number === null) {
        throw new RscError("Respons order RSC tidak berisi nomor order yang valid.", undefined, json);
    }
    return { number, status };
}

/** Kirim pesanan Telegram Stars ke RSC — akun kamu (RSC) yang dipotong, bukan Digora. */
export async function buyTelegramStarsOnRsc(telegramUsername: string, quantity: number): Promise<RscOrder> {
    const json = await rscPost("/telegram/stars/buy", {
        telegram_username: telegramUsername,
        quantity,
    });
    return parseRscOrder(json);
}

/** Kirim pesanan Telegram Premium ke RSC. months harus 3, 6, atau 12. */
export async function buyTelegramPremiumOnRsc(telegramUsername: string, months: number): Promise<RscOrder> {
    const json = await rscPost("/telegram/premium/buy", {
        telegram_username: telegramUsername,
        months,
    });
    return parseRscOrder(json);
}

/** Cek status terbaru sebuah order RSC (dipakai untuk sinkron status manual dari admin). */
export async function getRscOrderStatus(orderNumber: number): Promise<RscOrder> {
    const json = await rscGet(`/orders/${orderNumber}`);
    return parseRscOrder(json);
}

// Normalisasi status mentah RSC ke status internal Digora (ok/proc/wait/fail).
export function mapRscStatus(rscStatus: string): "ok" | "proc" | "wait" | "fail" {
    const s = rscStatus.toLowerCase();
    if (["completed", "success", "done"].includes(s)) return "ok";
    if (["failed", "refund", "refunded", "cancelled", "canceled"].includes(s)) return "fail";
    if (["waiting", "pending_payment"].includes(s)) return "wait";
    return "proc";
}

export { RscError };