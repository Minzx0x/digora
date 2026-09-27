"use client";

import { useMemo, useState } from "react";
import AdminSidebar from "./AdminSidebar";
import type { CustomerRow } from "@/lib/actions/admin";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

export default function AdminCustomers({ customers }: { customers: CustomerRow[] }) {
    const [q, setQ] = useState("");

    const rows = useMemo(
        () =>
            customers.filter(
                (c) =>
                    !q.trim() ||
                    (c.name + c.email + c.telegramUsername).toLowerCase().includes(q.trim().toLowerCase()),
            ),
        [customers, q],
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
                                    <th>Bergabung</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((c) => (
                                    <tr key={c.id}>
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
                                        <td className="mute">
                                            {new Date(c.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {rows.length === 0 && <div className="d-empty">Tidak ada pelanggan yang cocok.</div>}
                    </div>
                </section>
            </main>
        </div>
    );
}