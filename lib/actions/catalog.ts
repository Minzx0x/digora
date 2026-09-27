"use server";

import { createClient } from "@/lib/supabase/server";

export type PackageRow = {
    id: string;
    kind: "stars" | "premium";
    label: string;
    amount: number;
    unit: string;
    price: number; // harga jual — dihitung otomatis dari costPrice * (1 + marginPercent/100)
    costPrice: number; // modal / harga beli dari supplier
    marginPercent: number; // markup, dalam persen
    note: string;
};

// Katalog produk + harga — satu sumber data yang dipakai baik oleh halaman beli
// user maupun dashboard admin (admin ubah harga di sini, langsung kepakai di toko).
// Tidak butuh login untuk baca (RLS: packages_select_all for select using (true)).
export async function getCatalog(): Promise<PackageRow[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("packages")
        .select("id, kind, label, amount, unit, price, cost_price, margin_percent, note")
        .eq("active", true)
        .order("kind", { ascending: true })
        .order("sort_order", { ascending: true });

    return (data ?? []).map((p) => ({
        id: p.id as string,
        kind: p.kind as "stars" | "premium",
        label: p.label as string,
        amount: Number(p.amount),
        unit: p.unit as string,
        price: Number(p.price),
        costPrice: Number(p.cost_price ?? 0),
        marginPercent: Number(p.margin_percent ?? 0),
        note: p.note as string,
    }));
}