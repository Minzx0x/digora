// Tier "gamifikasi" berdasarkan total belanja SUKSES sepanjang waktu (bukan
// saldo/deposit) — cuma tampilan apresiasi, TIDAK ngubah harga/akses fitur
// apapun. Dipakai dari server (lib/actions/data.ts, lib/actions/admin.ts)
// MAUPUN client component (ProfilView, AdminCustomers) — makanya file ini
// sengaja TIDAK "use server", biar bisa diimpor sebagai fungsi biasa dari
// keduanya tanpa kena batasan Server Actions (yang cuma boleh ekspor async
// function). Ambang batasnya hardcode di sini dulu (bukan kolom
// admin-editable) karena belum ada yang minta itu bisa diatur.

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export type TierInfo = {
    tier: Tier;
    label: string;
    totalSpend: number;
    nextLabel: string | null;
    nextThreshold: number | null;
    progressPct: number; // 0-100 menuju tier berikutnya (100 kalau sudah tier tertinggi)
};

// Urut dari tertinggi ke terendah — dicari ambang batas TERTINGGI yang masih
// terlampaui oleh total belanja user.
const TIER_LEVELS: { tier: Tier; label: string; min: number }[] = [
    { tier: "platinum", label: "Platinum", min: 5_000_000 },
    { tier: "gold", label: "Gold", min: 2_000_000 },
    { tier: "silver", label: "Silver", min: 500_000 },
    { tier: "bronze", label: "Bronze", min: 0 },
];

export function getTierInfo(totalSpend: number): TierInfo {
    const idx = TIER_LEVELS.findIndex((t) => totalSpend >= t.min);
    const current = TIER_LEVELS[idx];
    const next = idx > 0 ? TIER_LEVELS[idx - 1] : null;
    const progressPct = next
        ? Math.max(0, Math.min(100, Math.round(((totalSpend - current.min) / (next.min - current.min)) * 100)))
        : 100;
    return {
        tier: current.tier,
        label: current.label,
        totalSpend,
        nextLabel: next?.label ?? null,
        nextThreshold: next?.min ?? null,
        progressPct,
    };
}

// Warna hex literal (bukan var(--d-*)) -- badge gamifikasi/dekoratif, sengaja
// tetap sama vivid-nya di kedua tema, sama kayak konvensi warna aksen/ikon
// platform lain di app ini.
export const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
    bronze: { bg: "#f4e4d7", text: "#8a5a2b" },
    silver: { bg: "#eef0f4", text: "#5b6472" },
    gold: { bg: "#fff1c9", text: "#92660a" },
    platinum: { bg: "#e8ecff", text: "#2540ff" },
};
