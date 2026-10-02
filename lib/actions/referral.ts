"use server";

import { createClient } from "@/lib/supabase/server";

export type ReferralStats = {
    code: string;
    referredCount: number;
    totalEarned: number;
    bonusPercent: number;
    bonusCap: number;
};

const EMPTY: ReferralStats = { code: "", referredCount: 0, totalEarned: 0, bonusPercent: 0, bonusCap: 0 };

export async function getReferralStats(): Promise<ReferralStats> {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return EMPTY;

    const { data, error } = await supabase.rpc("get_my_referral_stats").maybeSingle();
    if (error) {
        console.error("[referral] getReferralStats gagal:", error.message);
        return EMPTY;
    }
    const row = data as {
        referral_code?: string;
        referred_count?: number;
        total_earned?: number;
        bonus_percent?: number;
        bonus_cap?: number;
    } | null;
    if (!row) return EMPTY;

    return {
        code: row.referral_code ?? "",
        referredCount: Number(row.referred_count ?? 0),
        totalEarned: Number(row.total_earned ?? 0),
        bonusPercent: Number(row.bonus_percent ?? 0),
        bonusCap: Number(row.bonus_cap ?? 0),
    };
}
