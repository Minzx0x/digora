import Link from "next/link";
import DashboardSidebar from "@/components/DashboardSidebar";
import StarsView from "@/components/StarsView";
import { getDashboardData } from "@/lib/actions/data";
import { getCatalog } from "@/lib/actions/catalog";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default async function StarsPage() {
    const [data, catalog] = await Promise.all([getDashboardData(), getCatalog()]);
    const saldo = data.profile?.saldo ?? 0;
    return (
        <div className="dash">
            <DashboardSidebar active="stars" />
            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Stars & Premium</h1>
                        <p className="d-sub">Pilih produk dan paket, isi username, dibayar dari saldo.</p>
                    </div>
                    <div className="d-actions">
                        <Link className="u-saldo-pill" href="/dashboard/saldo">
                            Saldo <b>{rp(saldo)}</b>
                        </Link>
                    </div>
                </header>
                <StarsView catalog={catalog} saldo={saldo} />
            </main>
        </div>
    );
}