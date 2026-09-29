import DashboardSidebar from "@/components/DashboardSidebar";
import BantuanView from "@/components/BantuanView";
import TiketView from "@/components/TiketView";
import { getMyTicketsAction } from "@/lib/actions/tickets";

export default async function BantuanPage() {
    const tickets = await getMyTicketsAction();

    return (
        <div className="dash">
            <DashboardSidebar active="bantuan" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Bantuan</h1>
                        <p className="d-sub">Jawaban cepat dan kontak admin.</p>
                    </div>
                </header>
                <BantuanView />
                <TiketView tickets={tickets} />
            </main>
        </div>
    );
}