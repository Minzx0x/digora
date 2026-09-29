import { getSmmflareBalance } from "@/lib/actions/admin-smm";
import { StarCoin } from "./Coins";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

// Server Component async TERPISAH dari AdminSmmCatalog (client). page.tsx
// membungkus ini dengan <Suspense>, jadi lambat/hang-nya API smmflare cuma
// bikin KARTU INI yang nunggu — sisa halaman kurasi katalog langsung tampil.
export default async function SmmflareBalanceCard({ usdIdrRate }: { usdIdrRate: number }) {
    const { balanceIdr, configured, error } = await getSmmflareBalance(usdIdrRate);

    return (
        <div className="d-balance">
            <div className="d-balance-art" aria-hidden="true">
                <StarCoin scale={0.7} className="float-slow" />
            </div>
            <div className="d-balance-inner">
                <small>Saldo smmflare</small>
                <strong title={error ?? undefined}>
                    {!configured ? "Belum terhubung" : balanceIdr !== null ? rp(balanceIdr) : "Gagal dimuat"}
                </strong>
            </div>
            <div className="d-balance-foot">
                <a className="d-pill solid" href="https://smmflare.com" target="_blank" rel="noopener noreferrer">
                    Buka panel supplier ↗
                </a>
            </div>
        </div>
    );
}
