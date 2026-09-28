import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyPaymenkuSignature, parsePaymenkuWebhookPayload, mapPaymenkuStatus } from "@/lib/paymenku";

// Endpoint yang didaftarkan di dashboard Paymenku sebagai webhook URL, mis.
//   https://tokokamu.com/api/webhooks/paymenku
// Paymenku yang panggil endpoint ini (bukan browser user), jadi TIDAK ada
// sesi login sama sekali di sini — makanya pakai service-role client
// (lib/supabase/service.ts) buat update tabel deposits & saldo.
//
// Nama header sesuai contoh resmi di dashboard Paymenku (menu Webhook):
// X-PaymenKu-Signature + X-PaymenKu-Timestamp. Header HTTP tidak case-sensitive
// jadi req.headers.get() otomatis cocok berapa pun kapitalisasinya.
export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paymenku-signature");
    const timestamp = req.headers.get("x-paymenku-timestamp");

    if (!verifyPaymenkuSignature(rawBody, signature, timestamp)) {
        console.error("[paymenku webhook] signature tidak valid atau PAYMENKU_WEBHOOK_SECRET belum diisi");
        return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
    }

    let json: unknown;
    try {
        json = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }

    const payload = parsePaymenkuWebhookPayload(json);
    if (!payload) {
        console.error("[paymenku webhook] payload tidak berisi reference_id, cek format mentahnya:", rawBody);
        return NextResponse.json({ error: "missing_reference_id" }, { status: 400 });
    }

    const mapped = mapPaymenkuStatus(payload.status);
    const supabase = createServiceClient();

    try {
        // supabase-js TIDAK melempar exception buat error dari RPC (mis. fungsi
        // tidak ada, deposit_not_found, dst) — errornya balik lewat field `error`,
        // bukan try/catch. Makanya errornya dicek manual di sini; kalau tidak,
        // kegagalan bakal senyap dan Paymenku kelihatan berhasil padahal saldo
        // user tidak pernah nambah.
        if (mapped === "paid") {
            const { error } = await supabase.rpc("mark_deposit_paid", {
                p_reference_id: payload.referenceId,
                p_paymenku_trx_id: payload.trxId,
            });
            if (error) throw error;
        } else if (mapped === "failed") {
            const { error } = await supabase.rpc("mark_deposit_failed", { p_reference_id: payload.referenceId });
            if (error) throw error;
        }
        // status "pending" dari webhook (jarang dikirim, tapi kalau ada) sengaja
        // diabaikan — baris deposits memang sudah dibuat 'pending' sejak awal.
    } catch (e) {
        console.error("[paymenku webhook] gagal update deposit:", e);
        return NextResponse.json({ error: "internal_error" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}