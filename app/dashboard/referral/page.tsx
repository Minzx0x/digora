import DashboardSidebar from "@/components/DashboardSidebar";
import ReferralView from "@/components/ReferralView";
import { getReferralStats } from "@/lib/actions/referral";

export default async function ReferralPage() {
    const stats = await getReferralStats();
    return (
        <div className="dash">
            <DashboardSidebar active="referral" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Ajak Teman</h1>
                        <p className="d-sub">Bagikan kodemu, dapat komisi tiap teman yang top up pertama kali.</p>
                    </div>
                </header>
                <ReferralView initial={stats} />
            </main>
        </div>
    );
}
