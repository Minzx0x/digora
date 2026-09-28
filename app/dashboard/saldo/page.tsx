import DashboardSidebar from "@/components/DashboardSidebar";
import SaldoView from "@/components/SaldoView";
import { getDashboardData } from "@/lib/actions/data";

export default async function SaldoPage() {
    const data = await getDashboardData();
    return (
        <div className="dash">
            <DashboardSidebar active="saldo" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Isi Saldo</h1>
                        <p className="d-sub">Isi saldo dulu, lalu beli produk kapan saja tanpa ribet.</p>
                    </div>
                </header>
                <SaldoView saldo={data.profile?.saldo ?? 0} mutasi={data.mutasi} pendingDeposit={data.pendingDeposit} />
            </main>
        </div>
    );
}