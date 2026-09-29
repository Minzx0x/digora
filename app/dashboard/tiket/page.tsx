import DashboardSidebar from "@/components/DashboardSidebar";
import TiketView from "@/components/TiketView";
import { getMyTicketsAction } from "@/lib/actions/tickets";

export default async function TiketPage() {
    const tickets = await getMyTicketsAction();

    return (
        <div className="dash">
            <DashboardSidebar active="tiket" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Tiket</h1>
                        <p className="d-sub">Kirim kendala atau pertanyaan, admin bakal balas di sini.</p>
                    </div>
                </header>
                <TiketView tickets={tickets} />
            </main>
        </div>
    );
}
