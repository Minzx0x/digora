import DashboardSidebar from "@/components/DashboardSidebar";
import SmmView from "@/components/SmmView";
import { getDashboardData } from "@/lib/actions/data";
import { getSmmCatalog } from "@/lib/actions/smm";

export default async function SmmPage() {
    const [data, catalog] = await Promise.all([getDashboardData(), getSmmCatalog()]);
    const saldo = data.profile?.saldo ?? 0;
    return (
        <div className="dash">
            <DashboardSidebar active="smm" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">SMM Panel</h1>
                        <p className="d-sub">Followers, likes, views — pilih layanan, isi link, dibayar dari saldo.</p>
                    </div>
                </header>
                <SmmView catalog={catalog} saldo={saldo} />
            </main>
        </div>
    );
}
