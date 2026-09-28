import { getRscBalance } from "@/lib/actions/admin";
import { StarCoin } from "./Coins";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

// Server Component async TERPISAH dari AdminOverview (client). page.tsx
// membungkus ini dengan <Suspense>, jadi lambat/hang-nya API supplier cuma
// bikin KARTU INI yang nunggu — sisa halaman Ringkasan (sidebar, pesanan,
// grafik) langsung tampil dan tetap bisa dipakai.
export default async function SupplierBalanceCard({ usdIdrRate }: { usdIdrRate: number }) {
    const { rscBalanceIdr, rscConfigured, rscBalanceError } = await getRscBalance(usdIdrRate);

    return (
        <div className="d-balance">
            <div className="d-balance-art" aria-hidden="true">
                <StarCoin scale={0.7} className="float-slow" />
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
                <small>Saldo Supplier</small>
                <strong title={rscBalanceError ?? undefined}>
                    {!rscConfigured ? "Belum terhubung" : rscBalanceIdr !== null ? rp(rscBalanceIdr) : "Gagal dimuat"}
                </strong>
            </div>
            <div className="d-balance-foot">
                <a className="d-pill solid" href="https://resell.codes" target="_blank" rel="noopener noreferrer">
                    Buka panel supplier ↗
                </a>
            </div>
        </div>
    );
}