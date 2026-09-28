import DashboardSidebar from "@/components/DashboardSidebar";
import RiwayatView from "@/components/RiwayatView";
import { getDashboardData } from "@/lib/actions/data";

export default async function RiwayatPage() {
    const data = await getDashboardData();
    return (
        <div className="dash">
            <DashboardSidebar active="riwayat" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Pesanan saya</h1>
                        <p className="d-sub">Semua riwayat pembelian kamu.</p>
                    </div>
                </header>
                <RiwayatView orders={data.orders} />
            </main>
        </div>
    );
}