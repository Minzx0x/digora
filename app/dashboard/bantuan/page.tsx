import DashboardSidebar from "@/components/DashboardSidebar";
import BantuanView from "@/components/BantuanView";

export default function BantuanPage() {
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
            </main>
        </div>
    );
}