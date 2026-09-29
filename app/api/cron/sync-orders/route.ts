import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getRscOrderStatus, mapRscStatus, RscError } from "@/lib/rsc";
import { getSmmflareOrderStatus, mapSmmflareStatus, SmmflareError } from "@/lib/smmflare";

// Dipanggil berkala oleh cron job EKSTERNAL (bukan Vercel Cron — sesuai
// keputusan: pakai layanan cron job biasa yang nge-hit URL ini, mis. tiap 2-5
// menit), bukan dari sesi admin — makanya butuh CRON_SECRET sendiri buat
// otentikasi, bukan cek is_admin(). Isi CRON_SECRET di .env.local server DAN
// di Environment Variables project Vercel, lalu daftarkan URL ini di cron job
// dengan header "Authorization: Bearer <CRON_SECRET>" (atau query
// ?secret=<CRON_SECRET> kalau layanan cron-nya nggak bisa kirim header
// custom).
//
// Sebelum ini, order yang sudah diteruskan ke supplier (RSC/smmflare) tapi
// masih "Diproses" CUMA berubah status kalau admin klik "Cek RSC"/"Cek
// smmflare" manual satu-satu di /admin/pesanan — endpoint ini otomatis
// ngelakuin hal yang sama buat SEMUA order yang masih "Diproses",
// terjadwal, lewat RPC system_update_order_status (lihat
// supabase/cron-sync-orders.sql — beda gerbang izin dari RPC admin biasa).
function isAuthorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false; // belum dikonfigurasi -- jangan pernah nolak-diam-diam jadi "boleh"
    const header = req.headers.get("authorization");
    if (header === `Bearer ${secret}`) return true;
    const fromQuery = req.nextUrl.searchParams.get("secret");
    return fromQuery === secret;
}

// Batas jumlah order yang dicek SEKALI panggil -- dicek satu-satu (bukan
// paralel, biar nggak bikin supplier ngira lagi di-spam), jadi kalau kebanyakan
// sekaligus bisa kena timeout function serverless. Jadwalkan cron-nya sering
// (tiap beberapa menit) daripada naikin angka ini kalau order "Diproses"-nya banyak.
const BATCH_LIMIT = 20;

export async function GET(req: NextRequest) {
    if (!isAuthorized(req)) {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();
    let checked = 0;
    let updated = 0;
    let failed = 0;

    // ---- Order Telegram Stars/Premium yang masih "Diproses" (RSC) ----
    const { data: rscOrders } = await supabase
        .from("orders")
        .select("id, rsc_order_number")
        .in("kind", ["stars", "premium"])
        .eq("status", "proc")
        .not("rsc_order_number", "is", null)
        .limit(BATCH_LIMIT);

    for (const o of rscOrders ?? []) {
        checked++;
        try {
            const rscOrder = await getRscOrderStatus(Number(o.rsc_order_number));
            const newStatus = mapRscStatus(rscOrder.status);
            if (newStatus === "proc") continue;
            const { error } = await supabase.rpc("system_update_order_status", {
                p_order_id: o.id,
                p_status: newStatus,
                p_reason: newStatus === "fail" ? "Pesanan gagal diproses oleh supplier." : "",
            });
            if (error) throw new Error(error.message);
            updated++;
        } catch (e) {
            failed++;
            console.error("[cron sync-orders] gagal cek order RSC", o.id, e instanceof RscError ? e.message : e);
        }
    }

    // ---- Order SMM Panel yang masih "Diproses" (smmflare) ----
    const { data: smmOrders } = await supabase
        .from("orders")
        .select("id, provider_order_id")
        .eq("provider", "smmflare")
        .eq("status", "proc")
        .not("provider_order_id", "is", null)
        .limit(BATCH_LIMIT);

    for (const o of smmOrders ?? []) {
        checked++;
        try {
            const smmOrder = await getSmmflareOrderStatus(Number(o.provider_order_id));
            const newStatus = mapSmmflareStatus(smmOrder.status);
            if (newStatus === "proc") continue;
            const { error } = await supabase.rpc("system_update_order_status", {
                p_order_id: o.id,
                p_status: newStatus,
                p_reason: newStatus === "fail" ? "Pesanan gagal diproses oleh supplier." : "",
            });
            if (error) throw new Error(error.message);
            updated++;
        } catch (e) {
            failed++;
            console.error("[cron sync-orders] gagal cek order SMM", o.id, e instanceof SmmflareError ? e.message : e);
        }
    }

    return NextResponse.json({ checked, updated, failed });
}
