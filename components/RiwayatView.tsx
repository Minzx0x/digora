import type { OrderRow, Status } from "@/lib/actions/data";

const STATUS_LABEL: Record<Status, string> = {
    ok: "Selesai",
    proc: "Diproses",
    wait: "Menunggu bayar",
    fail: "Gagal",
};

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

// Server Component murni — tabel riwayat pesanan, tanpa interaksi client.
export default function RiwayatView({ orders }: { orders: OrderRow[] }) {
    return (
        <section className="d-card">
            <div className="d-card-head">
                <h2>Riwayat pesanan</h2>
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
                        {orders.map((o) => (
                            <tr key={o.id}>
                                <td>{o.id}</td>
                                <td>
                                    {o.to}
                                    {o.comments && (
                                        <details className="d-comments">
                                            <summary>Lihat komentar yang dikirim</summary>
                                            <pre>{o.comments}</pre>
                                        </details>
                                    )}
                                </td>
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
    );
}