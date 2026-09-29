import DashboardSidebar from "@/components/DashboardSidebar";
import SmmCatalogList from "@/components/SmmCatalogList";
import { getSmmCatalog } from "@/lib/actions/smm";

export default async function DaftarLayananPage() {
    const services = await getSmmCatalog();

    return (
        <div className="dash">
            <DashboardSidebar active="daftar-layanan" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Daftar Layanan</h1>
                        <p className="d-sub">Semua layanan SMM Panel yang tersedia — cari, lalu klik buat langsung pesan.</p>
                    </div>
                </header>
                <SmmCatalogList services={services} />
            </main>
        </div>
    );
}
