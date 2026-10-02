"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    type TooltipContentProps,
} from "recharts";
import AdminSidebar from "./AdminSidebar";
import { getAdminStatsData, type AdminStatsData, type StatsRange, type TrendPoint } from "@/lib/actions/admin-stats";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");

// Sumbu-Y kiri buat rupiah (Deposit/Revenue), sumbu-Y kanan pendek buat jumlah
// pesanan (angka satuan/puluhan) — kalau digabung satu sumbu, garis pesanan
// bakal numpuk rata di bawah ketimpa angka Rupiah yang jauh lebih besar.
function rpShort(n: number): string {
    if (n >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10}jt`;
    if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
    return String(n);
}

const RANGE_LABEL: Record<StatsRange, string> = {
    "7d": "7 Hari",
    "30d": "30 Hari",
    month: "Bulan Ini",
    lastMonth: "Bulan Lalu",
    all: "Sepanjang Waktu",
};

const SERIES = [
    { key: "deposit", name: "Deposit", color: "#2540ff" },
    { key: "revenue", name: "Revenue", color: "#f5a623" },
    { key: "orders", name: "Pesanan", color: "#34c759" },
] as const;

function ChartTooltip({ active, payload, label }: TooltipContentProps) {
    if (!active || !payload || payload.length === 0) return null;
    return (
        <div className="chart-tooltip">
            <b>{label}</b>
            {payload.map((p) => {
                const s = SERIES.find((x) => x.key === p.dataKey);
                return (
                    <div className="chart-tooltip-row" key={String(p.dataKey)}>
                        <span>
                            <i style={{ background: s?.color }} />
                            {s?.name ?? String(p.dataKey)}
                        </span>
                        <b>{p.dataKey === "orders" ? `${num(Number(p.value))} pesanan` : rp(Number(p.value))}</b>
                    </div>
                );
            })}
        </div>
    );
}

function TrendChart({ data }: { data: TrendPoint[] }) {
    return (
        <ResponsiveContainer width="100%" height={340}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="stat-fill-deposit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2540ff" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#2540ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="stat-fill-revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f5a623" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#f5a623" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--d-divider)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--d-text-mute-2)" }} axisLine={false} tickLine={false} />
                <YAxis
                    yAxisId="money"
                    tick={{ fontSize: 12, fill: "var(--d-text-mute-2)" }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tickFormatter={rpShort}
                />
                <YAxis
                    yAxisId="orders"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "var(--d-text-mute-2)" }}
                    axisLine={false}
                    tickLine={false}
                    width={34}
                    allowDecimals={false}
                />
                <Tooltip content={ChartTooltip} cursor={{ stroke: "#c9d1ff", strokeWidth: 1, strokeDasharray: "3 3" }} />
                <Area
                    yAxisId="money"
                    type="monotone"
                    dataKey="deposit"
                    stroke="#2540ff"
                    strokeWidth={2.5}
                    fill="url(#stat-fill-deposit)"
                    dot={false}
                    activeDot={{ r: 4 }}
                />
                <Area
                    yAxisId="money"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#f5a623"
                    strokeWidth={2.5}
                    fill="url(#stat-fill-revenue)"
                    dot={false}
                    activeDot={{ r: 4 }}
                />
                <Line
                    yAxisId="orders"
                    type="monotone"
                    dataKey="orders"
                    stroke="#34c759"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
}

function BreakdownBar({
    label,
    count,
    right,
    pct,
    color,
    unit = "pesanan",
}: {
    label: string;
    count: number;
    right: string;
    pct: number;
    color: string;
    unit?: string;
}) {
    return (
        <div className="stat-bar-row">
            <div className="stat-bar-top">
                <b>{label}</b>
                <span>
                    {num(count)} {unit} · {right}
                </span>
            </div>
            <div className="stat-bar-track">
                <div className="stat-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

const STATUS_COLOR: Record<string, string> = { ok: "#34c759", proc: "#2540ff", wait: "#f5a623", fail: "#e5484d" };
const KIND_COLOR = ["#2540ff", "#f5a623", "#34c759", "#8b5cf6"];

export default function AdminStatistik({ initial }: { initial: AdminStatsData }) {
    const router = useRouter();
    const [data, setData] = useState(initial);
    const [range, setRange] = useState<StatsRange>(initial.range);
    const [isPending, startTransition] = useTransition();

    function pickRange(r: StatsRange) {
        setRange(r);
        startTransition(async () => {
            const res = await getAdminStatsData(r);
            setData(res);
            router.refresh();
        });
    }

    return (
        <div className="dash">
            <AdminSidebar active="statistik" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Statistik</h1>
                        <p className="d-sub">Tren deposit, revenue, pesanan, dan pendaftar baru.</p>
                    </div>
                </header>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Rentang waktu</h2>
                        <div className="d-range" role="tablist" aria-label="Rentang waktu">
                            {(Object.keys(RANGE_LABEL) as StatsRange[]).map((r) => (
                                <button key={r} className={range === r ? "on" : ""} onClick={() => pickRange(r)} disabled={isPending}>
                                    {RANGE_LABEL[r]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="d-stats">
                        <div className="d-stat">
                            <span>Total deposit</span>
                            <strong>{rp(data.totals.deposit)}</strong>
                        </div>
                        <div className="d-stat">
                            <span>Total revenue</span>
                            <strong>{rp(data.totals.revenue)}</strong>
                        </div>
                        <div className="d-stat">
                            <span>Total pesanan</span>
                            <strong>{num(data.totals.orders)}</strong>
                        </div>
                        <div className="d-stat">
                            <span>User baru daftar</span>
                            <strong>{num(data.totals.newUsers)}</strong>
                        </div>
                        <div className="d-stat">
                            <span>Kunjungan halaman</span>
                            <strong>{num(data.totals.pageViews)}</strong>
                        </div>
                    </div>
                </section>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Tren deposit, revenue &amp; pesanan</h2>
                        <div className="trend-legend">
                            {SERIES.map((s) => (
                                <span key={s.key}>
                                    <i style={{ background: s.color }} /> {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                    <TrendChart data={data.trend} />
                </section>

                <section className="d-grid-mid">
                    <div className="d-card">
                        <div className="d-card-head">
                            <h2>Breakdown status pesanan</h2>
                        </div>
                        {data.statusBreakdown.every((s) => s.count === 0) ? (
                            <p className="d-note">Belum ada pesanan di rentang ini.</p>
                        ) : (
                            data.statusBreakdown
                                .filter((s) => s.count > 0)
                                .map((s) => (
                                    <BreakdownBar
                                        key={s.status}
                                        label={s.label}
                                        count={s.count}
                                        right={`${s.pct}%`}
                                        pct={s.pct}
                                        color={STATUS_COLOR[s.status] ?? "var(--d-text-mute-2)"}
                                    />
                                ))
                        )}
                    </div>

                    <div className="d-card">
                        <div className="d-card-head">
                            <h2>Breakdown jenis produk</h2>
                        </div>
                        {data.kindBreakdown.length === 0 ? (
                            <p className="d-note">Belum ada pesanan di rentang ini.</p>
                        ) : (
                            data.kindBreakdown.map((k, i) => (
                                <BreakdownBar
                                    key={k.kind}
                                    label={k.label}
                                    count={k.count}
                                    right={rp(k.revenue)}
                                    pct={k.pct}
                                    color={KIND_COLOR[i % KIND_COLOR.length]}
                                />
                            ))
                        )}
                    </div>
                </section>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Halaman paling sering dibuka</h2>
                    </div>
                    {data.topPages.length === 0 ? (
                        <p className="d-note">Belum ada data kunjungan di rentang ini.</p>
                    ) : (
                        data.topPages.map((p) => (
                            <BreakdownBar
                                key={p.path}
                                label={p.path}
                                count={p.count}
                                right={`${p.count} kunjungan`}
                                pct={Math.round((p.count / data.topPages[0].count) * 100)}
                                color="#2540ff"
                            />
                        ))
                    )}
                </section>
            </main>
        </div>
    );
}
