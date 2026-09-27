import AdminSidebar, { type AdminSection } from "./AdminSidebar";

// Tampil INSTAN (lewat loading.tsx di tiap route) begitu menu admin diklik,
// sebelum halaman tujuan selesai ambil data dari Supabase. Sidebar-nya sama
// persis dengan halaman aslinya supaya tidak "kedip" pindah layout — cuma isi
// utamanya yang berupa kotak abu-abu berkedip, lalu ditukar begitu data siap.
export default function AdminSkeleton({ active }: { active: AdminSection }) {
    return (
        <div className="dash">
            <AdminSidebar active={active} />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <div className="skel" style={{ width: 180, height: 28, marginBottom: 10 }} />
                        <div className="skel" style={{ width: 280, height: 14 }} />
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