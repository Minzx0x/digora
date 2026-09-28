import Link from "next/link";
import { StarCoin } from "./Coins";
import type { OrderRow, Status } from "@/lib/actions/data";

const STATUS_LABEL: Record<Status, string> = {
    ok: "Selesai",
    proc: "Diproses",
    wait: "Menunggu bayar",
    fail: "Gagal",
};

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

// Server Component murni — nggak ada state/interaksi di sini selain link
// biasa, jadi nggak perlu "use client" sama sekali.
export default function BerandaView({ saldo, orders }: { saldo: number; orders: OrderRow[] }) {
    const spent = orders.filter((o) => o.status === "ok").reduce((s, o) => s + o.total, 0);
    const active = orders.filter((o) => o.status === "wait" || o.status === "proc").length;

    return (
        <>
            <section className="d-grid-top">
                <div className="d-balance">
                    <div className="d-balance-art" aria-hidden="true">
                        <StarCoin scale={0.7} className="float-slow" />
                    </div>
                    <div className="d-balance-inner">
                        <small>Saldo kamu</small>
                        <strong>{rp(saldo)}</strong>
                    </div>
                    <div className="d-balance-foot">
                        <Link className="d-pill solid" href="/dashboard/saldo">
                            + Isi saldo
                        </Link>
                        <Link className="d-pill" href="/dashboard/stars">
                            Beli Stars
                        </Link>
                    </div>
                </div>

                <div className="d-stats">
                    <div className="d-stat">
                        <span>Total pesanan</span>
                        <strong>{orders.length}</strong>
                    </div>
                    <div className="d-stat">
                        <span>Total belanja</span>
                        <strong>{rp(spent)}</strong>
                    </div>
                    <div className="d-stat">
                        <span>Pesanan aktif</span>
                        <strong>{active}</strong>
                    </div>
                </div>
            </section>

            <section className="d-card">
                <div className="d-card-head">
                    <h2>Pesanan terbaru</h2>
                    <Link className="d-see-all" href="/dashboard/riwayat">
                        Lihat semua →
                    </Link>
                </div>
                <div className="d-table-wrap">
                    <table className="d-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Tujuan</th>
                                <th>Paket</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Waktu</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.slice(0, 3).map((o) => (
                                <tr key={o.id}>
                                    <td>{o.id}</td>
                                    <td>{o.to}</td>
                                    <td>{o.item}</td>
                                    <td>{rp(o.total)}</td>
                                    <td>
                                        <span className={`d-badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
                                        {o.status === "fail" && o.failReason && (
                                            <div className="mute d-mute-sm">
                                                {o.failReason}
                                            </div>
                                        )}
                                    </td>
                                    <td className="mute">{o.time}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}