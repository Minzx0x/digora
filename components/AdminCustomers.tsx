"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import { adminAdjustSaldoAction, type CustomerRow } from "@/lib/actions/admin";
import { getTierInfo, TIER_COLORS, type Tier } from "@/lib/tier";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

const TIER_FILTERS: readonly ["all" | Tier, string][] = [
    ["all", "Semua"],
    ["platinum", "Platinum"],
    ["gold", "Gold"],
    ["silver", "Silver"],
    ["bronze", "Bronze"],
];

export default function AdminCustomers({ customers }: { customers: CustomerRow[] }) {
    const router = useRouter();
    const [q, setQ] = useState("");
    const [tierFilter, setTierFilter] = useState<"all" | Tier>("all");
    const [openId, setOpenId] = useState<string | null>(null);
    const [amount, setAmount] = useState("");
    const [reason, setReason] = useState("");
    const [busy, setBusy] = useState(false);

    function toggleAdjust(id: string) {
        setOpenId((prev) => (prev === id ? null : id));
        setAmount("");
        setReason("");
    }

    async function applyAdjust(userId: string, sign: 1 | -1) {
        const n = Number(amount.replace(/\D/g, ""));
        if (!n) {
            window.alert("Isi jumlah saldo dulu.");
            return;
        }
        setBusy(true);
        const res = await adminAdjustSaldoAction(userId, n * sign, reason.trim());
        setBusy(false);
        if (res.error) {
            window.alert(res.error);
            return;
        }
        setOpenId(null);
        setAmount("");
        setReason("");
        router.refresh();
    }

    const rows = useMemo(
        () =>
            customers.filter(
                (c) =>
                    (!q.trim() || (c.name + c.email + c.telegramUsername).toLowerCase().includes(q.trim().toLowerCase())) &&
                    (tierFilter === "all" || getTierInfo(c.totalSpent).tier === tierFilter),
            ),
        [customers, q, tierFilter],
    );

    return (
        <div className="dash">
            <AdminSidebar active="pelanggan" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Pelanggan</h1>
                        <p className="d-sub">Semua akun yang terdaftar di Digora, saldo, dan total belanjanya.</p>
                    </div>
                    <div className="d-actions">
                        <input
                            className="d-search"
                            type="search"
                            placeholder="Cari nama / email / username telegram"
                            aria-label="Cari pelanggan"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                </header>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Semua pelanggan ({rows.length})</h2>
                        <div className="d-range" role="tablist" aria-label="Filter tier">
                            {TIER_FILTERS.map(([k, label]) => (
                                <button key={k} className={tierFilter === k ? "on" : ""} onClick={() => setTierFilter(k)}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="d-table-wrap">
                        <table className="d-table">
                            <thead>
                                <tr>
                                    <th>Nama</th>
                                    <th>Telegram</th>
                                    <th>Email</th>
                                    <th>Saldo</th>
                                    <th>Pesanan</th>
                                    <th>Total belanja</th>
                                    <th>Tier</th>
                                    <th>Bergabung</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((c) => {
                                    const tier = getTierInfo(c.totalSpent);
                                    return (
                                    <Fragment key={c.id}>
                                        <tr>
                                            <td>
                                                {c.name}
                                                {c.role === "admin" && (
                                                    <span className="d-badge ok" style={{ marginLeft: 6 }}>
                                                        Admin
                                                    </span>
                                                )}
                                            </td>
                                            <td>{c.telegramUsername ? "@" + c.telegramUsername : "-"}</td>
                                            <td>{c.email}</td>
                                            <td>{rp(c.saldo)}</td>
                                            <td>{c.orderCount}</td>
                                            <td>{rp(c.totalSpent)}</td>
                                            <td>
                                                <span
                                                    className="u-tier-badge"
                                                    style={{
                                                        background: TIER_COLORS[tier.tier].bg,
                                                        color: TIER_COLORS[tier.tier].text,
                                                    }}
                                                >
                                                    {tier.label}
                                                </span>
                                            </td>
                                            <td className="mute">
                                                {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                            </td>
                                            <td>
                                                <button type="button" className="d-pill" onClick={() => toggleAdjust(c.id)}>
                                                    {openId === c.id ? "Batal" : "Ubah saldo"}
                                                </button>
                                            </td>
                                        </tr>
                                        {openId === c.id && (
                                            <tr>
                                                <td colSpan={9}>
                                                    <div className="d-saldo-adjust">
                                                        <div className="u-input">
                                                            <input
                                                                inputMode="numeric"
                                                                placeholder="Jumlah (Rp)"
                                                                aria-label="Jumlah saldo"
                                                                value={amount}
                                                                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                                                            />
                                                        </div>
                                                        <div className="u-input">
                                                            <input
                                                                placeholder="Alasan (opsional)"
                                                                aria-label="Alasan penyesuaian saldo"
                                                                value={reason}
                                                                onChange={(e) => setReason(e.target.value)}
                                                            />
                                                        </div>
                                                        <button type="button" className="d-pill" disabled={busy} onClick={() => applyAdjust(c.id, 1)}>
                                                            + Tambah
                                                        </button>
                                                        <button type="button" className="d-pill" disabled={busy} onClick={() => applyAdjust(c.id, -1)}>
                                                            − Kurangi
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                        {rows.length === 0 && <div className="d-empty">Tidak ada pelanggan yang cocok.</div>}
                    </div>
                </section>
            </main>
        </div>
    );
}