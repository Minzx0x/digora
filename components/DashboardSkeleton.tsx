import DashboardSidebar, { type DashboardSection } from "./DashboardSidebar";

// Tampil INSTAN (lewat loading.tsx di tiap route) begitu menu dashboard
// diklik, sebelum halaman tujuan selesai ambil data dari Supabase. Sidebar-nya
// sama persis dengan halaman aslinya supaya tidak "kedip" pindah layout — cuma
// isi utamanya yang berupa kotak abu-abu berkedip, lalu ditukar begitu data siap.
export default function DashboardSkeleton({ active }: { active: DashboardSection }) {
    return (
        <div className="dash">
            <DashboardSidebar active={active} />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <div className="skel" style={{ width: 220, height: 28, marginBottom: 10 }} />
                        <div className="skel" style={{ width: 300, height: 14 }} />
                    </div>
                </header>

                <section className="d-card">
                    <div className="d-card-head">
                        <div className="skel" style={{ width: 160, height: 20 }} />
                    </div>
                    {[1, 2, 3, 4, 5].map((n) => (
                        <div key={n} className="skel-row" style={{ display: "flex", gap: 16, padding: "12px 0" }}>
                            <div className="skel" style={{ width: 90, height: 16 }} />
                            <div className="skel" style={{ width: 140, height: 16 }} />
                            <div className="skel" style={{ width: 110, height: 16 }} />
                            <div className="skel" style={{ width: 80, height: 16 }} />
                            <div className="skel" style={{ width: 100, height: 16 }} />
                        </div>
                    ))}
                </section>
            </main>
        </div>
    );
}