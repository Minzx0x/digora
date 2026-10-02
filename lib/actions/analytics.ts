"use server";

import { createClient } from "@/lib/supabase/server";

// Dipanggil dari PageViewTracker.tsx (client component di app/layout.tsx) --
// jalan di SEMUA halaman (landing page, dashboard, admin), termasuk
// pengunjung yang belum login. Gagal diam-diam (nggak perlu ganggu
// pengalaman pengunjung cuma gara-gara pencatatan kunjungan gagal).
export async function recordPageView(path: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("record_page_view", { p_path: path });
    if (error) console.error("[analytics] recordPageView gagal:", error.message);
}
