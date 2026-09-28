import { Suspense } from "react";
import DashboardView from "@/components/DashboardView";
import SupplierBalanceCard from "@/components/SupplierBalanceCard";
import { getAdminData } from "@/lib/actions/admin";

// Kartu saldo dulu ikut nunggu di dalam getAdminData() — kalau API supplier
// lambat/hang, SELURUH Ringkasan ikut nunggu (nggak bisa apa-apa sampai
// selesai/timeout). Sekarang dipisah: data cepat (pesanan, grafik, dst) dari
// getAdminData() langsung dipakai, sementara saldo supplier di-stream belakangan
// lewat <Suspense> — jadi kalau lambat, cuma kartu saldo yang nunjukin loading,
// sisa halaman (termasuk sidebar) langsung bisa dipakai.
function BalanceSkeleton() {
    return (
        <div className="d-balance">
            <div className="skel" style={{ width: 120, height: 12, marginBottom: 12 }} />
            <div className="skel" style={{ width: 160, height: 28 }} />
        </div>
    );
}

// Dashboard admin: stok Stars, semua pesanan — data asli dari Supabase.
// Proteksi role admin sudah ditangani di lib/supabase/middleware.ts (proxy.ts).
export default async function AdminPage() {
    const data = await getAdminData();
    return (
        <DashboardView
            data={data}
            balanceSlot={
                <Suspense fallback={<BalanceSkeleton />}>
                    <SupplierBalanceCard usdIdrRate={data.usdIdrRate} />
                </Suspense>
            }
        />
    );
}