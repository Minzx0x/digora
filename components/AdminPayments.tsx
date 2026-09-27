"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import type { PaymentRow } from "@/lib/actions/admin";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

function FlowIcon({ inFlow, size = 40 }: { inFlow: boolean; size?: number }) {
    return (
        <span
            className={`s-mut-ico ${inFlow ? "in" : "out"}`}
            style={{ width: size, height: size }}
            aria-hidden="true"
        >
            <svg
                width={Math.round(size * 0.45)}
                height={Math.round(size * 0.45)}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d={inFlow ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M19 12l-7 7-7-7"} />
            </svg>
        </span>
    );
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

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

export default function AdminPayments({ payments }: { payments: PaymentRow[] }) {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState<"all" | "in" | "out">("all");

    const rows = useMemo(
        () =>
            payments.filter((p) => {
                const matchQ = !q.trim() || (p.userName + p.userEmail + p.description).toLowerCase().includes(q.trim().toLowerCase());
                const matchFilter = filter === "all" || (filter === "in" ? p.amount > 0 : p.amount < 0);
                return matchQ && matchFilter;
            }),
        [payments, q, filter],
    );

    const totalIn = payments.filter((p) => p.amount > 0).reduce((s, p) => s + p.amount, 0);
    const totalOut = payments.filter((p) => p.amount < 0).reduce((s, p) => s + Math.abs(p.amount), 0);

    return (
        <div className="dash">
            <AdminSidebar active="pembayaran" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Pembayaran</h1>
                        <p className="d-sub">Riwayat isi saldo, refund, dan pemakaian saldo semua pelanggan.</p>
                    </div>
                    <div className="d-actions">
                        <input
                            className="d-search"
                            type="search"
                            placeholder="Cari nama / email / keterangan"
                            aria-label="Cari pembayaran"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                </header>

                <section className="d-grid-top">
                    <div className="d-stats d-stats-2col" style={{ gridColumn: "1 / -1" }}>
                        <div className="d-stat d-stat-row">
                            <FlowIcon inFlow size={48} />
                            <div>
                                <span>Total masuk (isi saldo + refund)</span>
                                <strong style={{ color: "#16a34a" }}>{rp(totalIn)}</strong>
                            </div>
                        </div>
                        <div className="d-stat d-stat-row">
                            <FlowIcon inFlow={false} size={48} />
                            <div>
                                <span>Total keluar (pemakaian beli)</span>
                                <strong style={{ color: "#dc2626" }}>{rp(totalOut)}</strong>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Semua transaksi saldo ({rows.length})</h2>
                        <div className="d-range" role="tablist" aria-label="Filter jenis">
                            {(
                                [
                                    ["all", "Semua"],
                                    ["in", "Masuk"],
                                    ["out", "Keluar"],
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
                                    <th>Pelanggan</th>
                                    <th>Keterangan</th>
                                    <th>Jumlah</th>
                                    <th>Waktu</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                                <span className="d-avatar" aria-hidden="true">
                                                    {initials(p.userName)}
                                                </span>
                                                <div>
                                                    <div>{p.userName}</div>
                                                    <div className="mute" style={{ fontSize: 12, fontWeight: 500 }}>
                                                        {p.userEmail}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{p.description}</td>
                                        <td>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                                <FlowIcon inFlow={p.amount >= 0} size={28} />
                                                <b style={{ color: p.amount >= 0 ? "#16a34a" : "#dc2626" }}>
                                                    {p.amount >= 0 ? "+" : "-"}
                                                    {rp(Math.abs(p.amount))}
                                                </b>
                                            </div>
                                        </td>
                                        <td className="mute">{timeAgo(p.time)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length === 0 && <div className="d-empty">Tidak ada transaksi yang cocok.</div>}
                    </div>
                </section>
            </main>
        </div>
    );
}