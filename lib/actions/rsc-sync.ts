"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getRscStarsRateUsd, getRscPremiumRatesUsd, RscError } from "@/lib/rsc";

export type RscSyncResult = {
    error: string | null;
    updated: number; // berapa baris packages yang modalnya berhasil diupdate
    skipped: string[]; // label paket yang dilewati (tidak ada harga cocok dari RSC)
};

// Tarik harga modal (cost_price) Telegram Stars & Premium dari API supplier RSC
// (resell.codes), HANYA kategori Telegram — endpoint gift card/top-up game/dst
// di RSC sengaja tidak pernah dipanggil dari sini. Markup (margin_percent) yang
// sudah diatur admin TIDAK disentuh; harga jual (price) otomatis mengikuti lewat
// trigger recalc_package_price di Postgres begitu cost_price berubah.
export async function syncTelegramCostFromRSC(): Promise<RscSyncResult> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return { error: "Belum login.", updated: 0, skipped: [] };

    const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();
    if (me?.role !== "admin") return { error: "Akun ini bukan admin.", updated: 0, skipped: [] };

    const { data: settings } = await supabase.from("app_settings").select("usd_idr_rate").eq("id", true).maybeSingle();
    const usdIdr = Number(settings?.usd_idr_rate ?? 16300);
    if (!Number.isFinite(usdIdr) || usdIdr <= 0) {
        return { error: "Kurs USD->IDR belum diset dengan benar.", updated: 0, skipped: [] };
    }

    const { data: packages } = await supabase
        .from("packages")
        .select("id, kind, label, amount")
        .eq("active", true);
    if (!packages || packages.length === 0) {
        return { error: "Katalog packages kosong.", updated: 0, skipped: [] };
    }

    let starsPerUnitUsd: number | null = null;
    let premiumRatesUsd: Record<number, number> | null = null;
    const skipped: string[] = [];

    try {
        starsPerUnitUsd = await getRscStarsRateUsd();
    } catch (e) {
        if (e instanceof RscError) {
            return { error: `Gagal ambil harga Stars dari RSC: ${e.message}`, updated: 0, skipped: [] };
        }
        return { error: "Gagal ambil harga Stars dari RSC.", updated: 0, skipped: [] };
    }

    try {
        premiumRatesUsd = await getRscPremiumRatesUsd();
    } catch (e) {
        if (e instanceof RscError) {
            return { error: `Gagal ambil harga Premium dari RSC: ${e.message}`, updated: 0, skipped: [] };
        }
        return { error: "Gagal ambil harga Premium dari RSC.", updated: 0, skipped: [] };
    }

    let updated = 0;
    for (const p of packages) {
        const kind = p.kind as "stars" | "premium";
        const amount = Number(p.amount);
        let newCostPrice: number | null = null;

        if (kind === "stars" && starsPerUnitUsd !== null) {
            newCostPrice = Math.round(amount * starsPerUnitUsd * usdIdr);
        } else if (kind === "premium" && premiumRatesUsd && premiumRatesUsd[amount] !== undefined) {
            newCostPrice = Math.round(premiumRatesUsd[amount] * usdIdr);
        }

        if (newCostPrice === null) {
            skipped.push(p.label as string);
            continue;
        }

        const { error } = await supabase.from("packages").update({ cost_price: newCostPrice }).eq("id", p.id as string);
        if (!error) updated++;
    }

    revalidatePath("/admin", "layout");
    revalidatePath("/dashboard", "layout");

    return { error: null, updated, skipped };
}