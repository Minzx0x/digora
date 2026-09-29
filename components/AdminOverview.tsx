"use client";

import { useMemo, useState, type ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";
import type { AdminData, AdminStatus } from "@/lib/actions/admin";

const STATUS_LABEL: Record<AdminStatus, string> = {
    ok: "Selesai",
    proc: "Diproses",
    wait: "Menunggu bayar",
    fail: "Gagal",
};

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

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

/* ───────── grafik ───────── */

function Chart({ data }: { data: readonly { l: string; v: number }[] }) {
    // W dibikin lebar (bukan 640 lagi) biar rasio bawaan grafiknya sendiri udah
    // landscape — jadi pas di-lebarin penuh selebar kartu (lihat .d-chart di
    // dashboard.css, sudah tanpa max-width), tingginya otomatis proporsional dan
    // gak jadi kegedean di layar lebar. Sebelumnya dibatasi max-width:760px di
    // CSS supaya gak melar tinggi, tapi itu malah nyisain ruang kosong di kanan
    // pas kartunya lebih lebar dari itu.
    const W = 1400;
    const H = 330;
    const padL = 34;
    const padB = 28;
    const padT = 14;
    const max = Math.max(1, Math.ceil(Math.max(...data.map((d) => d.v))));
    const ticks = [0, max / 2, max];
    const innerW = W - padL;
    const innerH = H - padB - padT;
    const slot = innerW / Math.max(1, data.length);
    const bw = Math.min(70, slot * 0.55);
    const top = data.reduce((a, b) => (b.v > a.v ? b : a), data[0]);

    return (
        <svg className="d-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Pendapatan dalam jutaan rupiah">
            {ticks.map((t) => {
                const y = padT + innerH - (t / max) * innerH;
                return (
                    <g key={t}>
                        <line x1={padL} x2={W} y1={y} y2={y} stroke="var(--d-divider)" strokeWidth="1" />
                        <text x={padL - 8} y={y + 4} textAnchor="end">
                            {t}jt
                        </text>
                    </g>
                );
            })}
            {data.map((d, i) => {
                const h = (d.v / max) * innerH;
                const x = padL + slot * i + (slot - bw) / 2;
                const y = padT + innerH - h;
                const hot = d === top && d.v > 0;
                return (
                    <g key={`${d.l}-${i}`}>
                        <rect x={x} y={y} width={bw} height={h} rx="10" fill={hot ? "#2540ff" : "#c9d1ff"}>
                            <title>{`${d.l}: Rp ${d.v} jt`}</title>
                        </rect>
                        {hot && (
                            <text x={x + bw / 2} y={y - 6} textAnchor="middle" style={{ fill: "#2540ff", fontWeight: 700 }}>
                                {d.v}jt
                            </text>
                        )}
                        <text x={x + bw / 2} y={H - 8} textAnchor="middle">
                            {d.l}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

/* ───────── halaman ───────── */

export default function AdminOverview({ data, balanceSlot }: { data: AdminData; balanceSlot: ReactNode }) {
    const [range, setRange] = useState<"7 hari" | "30 hari">("7 hari");
    const [filter, setFilter] = useState<"all" | AdminStatus>("all");
    const [q, setQ] = useState("");

    const series = range === "7 hari" ? data.revenue7 : data.revenue30;

    const rows = useMemo(
        () =>
            data.orders.filter(
                (o) =>
                    (filter === "all" || o.status === filter) &&
                    (!q.trim() || (o.code + o.username).toLowerCase().includes(q.trim().toLowerCase())),
            ),
        [data.orders, filter, q],
    );

    return (
        <div className="dash">
            <AdminSidebar active="ringkasan" />

            <main className="d-main" id="ringkasan">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Halo, Digora 👋</h1>
                        <p className="d-sub">Ringkasan penjualan Telegram Stars kamu hari ini.</p>
                    </div>
                    <div className="d-actions">
                        <input
                            className="d-search"
                            type="search"
                            placeholder="Cari order / username"
                            aria-label="Cari pesanan"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <a className="d-btn" href="/admin/paket">+ Kelola paket</a>
                    </div>
                </header>

                <section className="d-grid-top">
                    {balanceSlot}

                    <div className="d-stats">
                        <div className="d-stat">
                            <span>Pesanan hari ini</span>
                            <strong>{data.todayOrders}</strong>
                            {data.todayOrdersDelta !== 0 && (
                                <em className={`d-delta ${data.todayOrdersDelta < 0 ? "down" : ""}`} style={{ fontStyle: "normal" }}>
                                    {data.todayOrdersDelta > 0 ? "▲" : "▼"} {Math.abs(data.todayOrdersDelta)}
                                </em>
                            )}
                        </div>
                        <div className="d-stat">
                            <span>Pendapatan hari ini</span>
                            <strong>{rp(data.todayRevenue)}</strong>
                            {data.todayRevenueDeltaPct !== null && (
                                <em className={`d-delta ${data.todayRevenueDeltaPct < 0 ? "down" : ""}`} style={{ fontStyle: "normal" }}>
                                    {data.todayRevenueDeltaPct > 0 ? "▲" : "▼"} {Math.abs(data.todayRevenueDeltaPct)}%
                                </em>
                            )}
                        </div>
                        <div className="d-stat">
                            <span>Menunggu bayar</span>
                            <strong>{data.waitingCount}</strong>
                        </div>
                    </div>
                </section>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Pendapatan</h2>
                        <div className="d-range" role="tablist" aria-label="Rentang waktu">
                            {(["7 hari", "30 hari"] as const).map((k) => (
                                <button key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>
                                    {k}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Chart data={series} />
                </section>

                <section className="d-card" id="pesanan">
                    <div className="d-card-head">
                        <h2>Pesanan terbaru</h2>
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
                                                <div className="mute d-mute-sm">
                                                    {o.failReason}
                                                </div>
                                            )}
                                            {o.rscOrderNumber !== null && (
                                                <div className="mute d-mute-xs">
                                                    RSC #{o.rscOrderNumber}
                                                </div>
                                            )}
                                        </td>
                                        <td className="mute">{timeAgo(o.time)}</td>
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