import DashboardSidebar from "@/components/DashboardSidebar";
import ProfilView from "@/components/ProfilView";
import { getDashboardData } from "@/lib/actions/data";

export default async function ProfilPage() {
    const data = await getDashboardData();
    return (
        <div className="dash">
            <DashboardSidebar active="profil" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Profil</h1>
                        <p className="d-sub">Data akun dan keamanan.</p>
                    </div>
                </header>
                <ProfilView
                    initial={{
                        name: data.profile?.name ?? "",
                        telegramUsername: data.profile?.telegramUsername ?? "",
                        email: data.profile?.email ?? "",
                    }}
                />
            </main>
        </div>
    );
}