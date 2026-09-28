import Link from "next/link";
import DashboardSidebar from "@/components/DashboardSidebar";
import BerandaView from "@/components/BerandaView";
import { getDashboardData } from "@/lib/actions/data";

export default async function BerandaPage() {
    const data = await getDashboardData();
    return (
        <div className="dash">
            <DashboardSidebar active="beranda" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Halo, selamat datang 👋</h1>
                        <p className="d-sub">Ringkasan akun dan pesanan terbarumu.</p>
                    </div>
                    <div className="d-actions">
                        <Link className="d-btn" href="/dashboard/stars">
                            + Beli Stars
                        </Link>
                    </div>
                </header>
                <BerandaView saldo={data.profile?.saldo ?? 0} orders={data.orders} />
            </main>
        </div>
    );
}