"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import { adminUpdateOrderStatusAction, adminCheckRscOrderAction, type AdminOrderRow, type AdminStatus } from "@/lib/actions/admin";

const STATUS_LABEL: Record<AdminStatus, string> = {
    ok: "Selesai",
    proc: "Diproses",
    wait: "Menunggu bayar",
    fail: "Gagal",
};

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

function timeAgo(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 1) return "Baru saja";
    if (min < 60) return `${min} menit lalu`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} jam lalu`;
    const day = Math.floor(hour / 24);
    if (day === 1) return "Kemarin";
    if (day < 7) return `${day} hari lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminOrders({ orders }: { orders: AdminOrderRow[] }) {
    const router = useRouter();
    const [filter, setFilter] = useState<"all" | AdminStatus>("all");
    const [q, setQ] = useState("");
    const [busyId, setBusyId] = useState<string | null>(null);

    const rows = useMemo(
        () =>
            orders.filter(
                (o) =>
                    (filter === "all" || o.status === filter) &&
                    (!q.trim() || (o.code + o.username + o.packageLabel).toLowerCase().includes(q.trim().toLowerCase())),
            ),
        [orders, filter, q],
    );

    async function setStatus(orderId: string, status: AdminStatus) {
        if (status === "fail" && !window.confirm("Tandai gagal? Saldo pembeli akan otomatis dikembalikan.")) return;
        setBusyId(orderId);
        await adminUpdateOrderStatusAction(orderId, status);
        setBusyId(null);
        router.refresh();
    }

    async function checkRsc(orderId: string, rscOrderNumber: number) {
        setBusyId(orderId);
        const res = await adminCheckRscOrderAction(orderId, rscOrderNumber);
        setBusyId(null);
        if (res.error) window.alert(res.error);
        router.refresh();
    }

    return (
        <div className="dash">
            <AdminSidebar active="pesanan" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Pesanan</h1>
                        <p className="d-sub">Semua pesanan yang masuk ke Digora, lengkap dengan status pengiriman di RSC.</p>
                    </div>
                    <div className="d-actions">
                        <input
                            className="d-search"
                            type="search"
                            placeholder="Cari order / username / paket"
                            aria-label="Cari pesanan"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                </header>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Semua pesanan ({rows.length})</h2>
                        <div className="d-range" role="tablist" aria-label="Filter status">
                            {(
                                [
                                    ["all", "Semua"],
                                    ["ok", "Selesai"],
                                    ["proc", "Diproses"],
                                    ["wait", "Menunggu"],
                                    ["fail", "Gagal"],
                                ] as const
                            ).map(([k, label]) => (
                                <button key={k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="d-table-wrap">
                        <table className="d-table">
                            <thead>
                                <tr>
                                    <th>Order</th>
                                    <th>Username</th>
                                    <th>Paket</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                    <th>Waktu</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((o) => (
                                    <tr key={o.id}>
                                        <td>{o.code}</td>
                                        <td>{o.username}</td>
                                        <td>{o.packageLabel}</td>
                                        <td>{rp(o.total)}</td>
                                        <td>
                                            <span className={`d-badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
                                            {o.status === "fail" && o.failReason && (
                                                <div className="mute" style={{ fontSize: 12, marginTop: 2 }}>
                                                    {o.failReason}
                                                </div>
                                            )}
                                            {o.rscOrderNumber !== null && (
                                                <div className="mute" style={{ fontSize: 11, marginTop: 2 }}>
                                                    RSC #{o.rscOrderNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td className="mute">{timeAgo(o.time)}</td>
                                        <td>
                                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                {o.rscOrderNumber !== null && (
                                                    <button
                                                        type="button"
                                                        className="d-pill"
                                                        disabled={busyId === o.id}
                                                        onClick={() => checkRsc(o.id, o.rscOrderNumber!)}
                                                    >
                                                        ⟳ Cek RSC
                                                    </button>
                                                )}
                                                {o.status !== "ok" && (
                                                    <button
                                                        type="button"
                                                        className="d-pill"
                                                        disabled={busyId === o.id}
                                                        onClick={() => setStatus(o.id, "ok")}
                                                    >
                                                        Tandai selesai
                                                    </button>
                                                )}
                                                {o.status !== "fail" && (
                                                    <button
                                                        type="button"
                                                        className="d-pill"
                                                        disabled={busyId === o.id}
                                                        onClick={() => setStatus(o.id, "fail")}
                                                    >
                                                        Tandai gagal
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length === 0 && <div className="d-empty">Tidak ada pesanan yang cocok.</div>}
                    </div>
                </section>
            </main>
        </div>
    );
}