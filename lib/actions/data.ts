"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { buyTelegramStarsOnRsc, buyTelegramPremiumOnRsc, mapRscStatus, RscError } from "@/lib/rsc";
import { createPaymenkuTransaction, PAYMENKU_CHANNEL_CODE, PaymenkuError } from "@/lib/paymenku";

export type Status = "ok" | "proc" | "wait" | "fail";

export type OrderRow = {
    id: string;
    to: string;
    item: string;
    total: number;
    status: Status;
    time: string; // ISO, diterjemahkan ke label relatif di komponen
    failReason: string;
};

export type MutasiRow = { id: string; desc: string; amount: number; time: string };

export type PendingDepositRow = {
    referenceId: string;
    amount: number;
    payUrl: string;
    qrString: string;
    time: string;
};

export type DashboardData = {
    profile: { name: string; telegramUsername: string; email: string; saldo: number } | null;
    orders: OrderRow[];
    mutasi: MutasiRow[];
    // Tagihan Paymenku yang masih 'pending' terakhir (kalau ada) — dipakai buat
    // munculin lagi kartu QR/status "menunggu pembayaran" kalau user nge-refresh
    // halaman sebelum pembayarannya kelar, biar gak ilang gitu aja.
    pendingDeposit: PendingDepositRow | null;
};

const EMPTY: DashboardData = { profile: null, orders: [], mutasi: [], pendingDeposit: null };

function friendlyDbError(message: string): string {
    const m = message.toLowerCase();
    if (m.includes("insufficient_balance")) return "Saldo tidak cukup.";
    if (m.includes("not_authenticated")) return "Sesi berakhir, silakan login lagi.";
    if (m.includes("invalid_amount")) return "Nominal tidak valid.";
    if (m.includes("profile_not_found")) return "Profil tidak ditemukan. Coba login ulang.";
    return "Gagal memproses. Coba lagi.";
}

export async function getDashboardData(): Promise<DashboardData> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return EMPTY;

    const [{ data: profile }, { data: orders }, { data: mutasi }, { data: pending }] = await Promise.all([
        supabase
            .from("profiles")
            .select("name, telegram_username, email, saldo")
            .eq("id", auth.user.id)
            .maybeSingle(),
        supabase
            .from("orders")
            .select("order_code, target_username, package_label, total, status, created_at, fail_reason")
            .eq("user_id", auth.user.id)
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("saldo_mutations")
            .select("id, description, amount, created_at")
            .eq("user_id", auth.user.id)
            .order("created_at", { ascending: false })
            .limit(30),
        supabase
            .from("deposits")
            .select("reference_id, amount, pay_url, qr_string, created_at")
            .eq("user_id", auth.user.id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    return {
        profile: profile
            ? {
                name: profile.name ?? "",
                telegramUsername: profile.telegram_username ?? "",
                email: profile.email ?? auth.user.email ?? "",
                saldo: Number(profile.saldo ?? 0),
            }
            : { name: "", telegramUsername: "", email: auth.user.email ?? "", saldo: 0 },
        orders: (orders ?? []).map((o) => ({
            id: o.order_code as string,
            to: "@" + o.target_username,
            item: o.package_label as string,
            total: Number(o.total),
            status: o.status as Status,
            time: o.created_at as string,
            failReason: (o.fail_reason as string) ?? "",
        })),
        mutasi: (mutasi ?? []).map((m) => ({
            id: m.id as string,
            desc: m.description as string,
            amount: Number(m.amount),
            time: m.created_at as string,
        })),
        pendingDeposit: pending
            ? {
                referenceId: pending.reference_id as string,
                amount: Number(pending.amount),
                payUrl: (pending.pay_url as string) ?? "",
                qrString: (pending.qr_string as string) ?? "",
                time: pending.created_at as string,
            }
            : null,
    };
}

export async function buyOrderAction(input: {
    targetUsername: string;
    kind: "stars" | "premium";
    packageLabel: string;
    units: number;
    total: number;
}): Promise<{ error: string | null; orderCode?: string }> {
    const supabase = await createClient();
    const targetUsername = input.targetUsername.replace(/^@/, "");
    const { data, error } = await supabase.rpc("buy_with_saldo", {
        p_target_username: targetUsername,
        p_kind: input.kind,
        p_package_label: input.packageLabel,
        p_units: input.units,
        p_total: input.total,
    });
    if (error) return { error: friendlyDbError(error.message) };

    const order = data as { id?: string; order_code?: string } | null;

    // Saldo Digora sudah terpotong dan order tercatat. Sekarang teruskan ke
    // supplier RSC supaya Stars/Premium-nya benar-benar dikirim — kalau RSC
    // menolak (mis. saldo RSC kosong), order ini otomatis ditandai gagal dan
    // saldo pembeli di Digora dikembalikan lagi lewat sync_order_from_rsc.
    // Kalau RSC_API_KEY belum diisi sama sekali, langkah ini dilewati (order
    // tetap "Diproses" seperti sebelumnya) supaya tidak mem-blokir dev/testing.
    if (order?.id && process.env.RSC_API_KEY) {
        try {
            const rscOrder =
                input.kind === "stars"
                    ? await buyTelegramStarsOnRsc(targetUsername, input.units)
                    : await buyTelegramPremiumOnRsc(targetUsername, input.units);

            await supabase.rpc("sync_order_from_rsc", {
                p_order_id: order.id,
                p_rsc_number: rscOrder.number,
                p_rsc_status: rscOrder.status,
                p_new_status: mapRscStatus(rscOrder.status),
                p_reason: "",
            });
        } catch (e) {
            const reason = e instanceof RscError ? e.message : "Gagal meneruskan pesanan ke supplier.";
            await supabase.rpc("sync_order_from_rsc", {
                p_order_id: order.id,
                p_rsc_number: null,
                p_rsc_status: "failed",
                p_new_status: "fail",
                p_reason: reason,
            });
            revalidatePath("/dashboard");
            return { error: `Pesanan gagal diproses supplier: ${reason} Saldo sudah dikembalikan.` };
        }
    }

    revalidatePath("/dashboard");
    return { error: null, orderCode: order?.order_code };
}

export type DepositMethod = "qris" | "ewallet" | "bank";

// Catatan: file ini "use server", jadi cuma boleh mengekspor async function
// (dan type, yang dihapus saat kompilasi) — konstanta/fungsi biasa di bawah
// ini SENGAJA tidak diekspor, cukup dipakai secara internal di file ini.
const MIN_DEPOSIT_AMOUNT = 10000;

// Sama persis dengan rumus biaya yang ditampilkan di UI (UserDashboard.tsx)
// supaya nominal yang benar-benar ditagihkan ke Paymenku tidak beda dengan
// yang dilihat user sebelum klik "Isi saldo sekarang".
function depositFee(method: DepositMethod, amount: number): number {
    if (method === "qris") return Math.round(amount * 0.007);
    if (method === "ewallet") return 1500;
    return 3000;
}

export type DepositResult = {
    error: string | null;
    referenceId?: string;
    payUrl?: string;
    qrString?: string;
};

/**
 * Mulai satu tagihan isi saldo lewat Paymenku. Saldo BELUM ditambah di sini —
 * baru ditambah otomatis lewat webhook (app/api/webhooks/paymenku/route.ts)
 * begitu Paymenku konfirmasi pembayaran sukses. Hasil dari sini cuma info
 * buat ditampilkan ke user (QR code / link bayar) sambil menunggu.
 */
export async function createDepositAction(input: {
    amount: number;
    method: DepositMethod;
}): Promise<DepositResult> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Sesi berakhir, silakan login lagi." };

    if (!Number.isFinite(input.amount) || input.amount < MIN_DEPOSIT_AMOUNT) {
        return { error: `Minimal isi saldo Rp ${MIN_DEPOSIT_AMOUNT.toLocaleString("id-ID")}.` };
    }
    const channelCode = PAYMENKU_CHANNEL_CODE[input.method];
    if (!channelCode) return { error: "Metode pembayaran tidak dikenali." };

    const fee = depositFee(input.method, input.amount);
    const referenceId = `dep_${randomUUID()}`;

    const { error: pendingErr } = await supabase.rpc("create_pending_deposit", {
        p_amount: input.amount,
        p_fee: fee,
        p_method: input.method,
        p_channel_code: channelCode,
        p_reference_id: referenceId,
    });
    if (pendingErr) return { error: friendlyDbError(pendingErr.message) };

    const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", auth.user.id)
        .maybeSingle();

    try {
        const trx = await createPaymenkuTransaction({
            referenceId,
            amount: input.amount + fee,
            channelCode,
            customerName: profile?.name || "Pelanggan Digora",
            customerEmail: profile?.email || auth.user.email || undefined,
        });

        const { error: updateErr } = await supabase.rpc("update_deposit_gateway_info", {
            p_reference_id: referenceId,
            p_paymenku_trx_id: trx.trxId,
            p_pay_url: trx.payUrl,
            p_qr_string: trx.qrString,
        });
        // Tidak fatal buat user (QR/link tetap dikirim balik dari trx di bawah),
        // tapi kalau baris deposits gagal disimpan trx_id-nya, dicatat saja biar
        // ketahuan kalau nanti mau di-debug.
        if (updateErr) console.error("[createDepositAction] gagal simpan info gateway:", updateErr.message);

        revalidatePath("/dashboard");
        return { error: null, referenceId, payUrl: trx.payUrl, qrString: trx.qrString };
    } catch (e) {
        // Gagal di tahap bikin transaksi ke Paymenku (mis. API key belum diisi,
        // atau gateway-nya sendiri error) — batalkan baris pending tadi supaya
        // tidak ada tagihan "menggantung" di riwayat.
        await supabase.rpc("cancel_own_pending_deposit", { p_reference_id: referenceId });
        const msg =
            e instanceof PaymenkuError
                ? e.message
                : "Gagal membuat tagihan pembayaran. Coba lagi sebentar lagi.";
        return { error: msg };
    }
}

/** User batalkan tagihan yang masih pending (mis. klik "Batalkan" di kartu QR). */
export async function cancelDepositAction(referenceId: string): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_own_pending_deposit", { p_reference_id: referenceId });
    if (error) return { error: friendlyDbError(error.message) };
    revalidatePath("/dashboard");
    return { error: null };
}

/** Dipanggil UI buat polling status tagihan sambil nunggu webhook Paymenku masuk. */
export async function getDepositStatusAction(
    referenceId: string,
): Promise<{ error: string | null; status?: "pending" | "paid" | "failed" | "expired"; amount?: number }> {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_deposit_status", { p_reference_id: referenceId });
    if (error) return { error: friendlyDbError(error.message) };
    const row = data as { status?: string; amount?: number } | null;
    if (!row?.status) return { error: "Transaksi tidak ditemukan." };
    if (row.status === "paid") revalidatePath("/dashboard");
    return { error: null, status: row.status as "pending" | "paid" | "failed" | "expired", amount: row.amount };
}

export async function updateProfileAction(input: {
    name: string;
    telegramUsername: string;
}): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Sesi berakhir, silakan login lagi." };

    const { error } = await supabase
        .from("profiles")
        .update({
            name: input.name,
            telegram_username: input.telegramUsername.replace(/^@/, ""),
        })
        .eq("id", auth.user.id);

    if (error) return { error: "Gagal menyimpan profil." };
    revalidatePath("/dashboard");
    return { error: null };
}

export async function changePasswordAction(input: {
    oldPassword: string;
    newPassword: string;
}): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user?.email) return { error: "Sesi berakhir, silakan login lagi." };

    // verifikasi password lama dulu sebelum mengganti
    const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: auth.user.email,
        password: input.oldPassword,
    });
    if (reauthError) return { error: "Password lama salah." };

    const { error } = await supabase.auth.updateUser({ password: input.newPassword });
    if (error) return { error: "Gagal mengganti password. Coba lagi." };
    return { error: null };
}