"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import {
    adminUpdateOrderStatusAction,
    adminCheckRscOrderAction,
    adminCheckSmmOrderAction,
    adminRefillSmmOrderAction,
    adminCheckRefillStatusAction,
    adminCancelSmmOrderAction,
    type AdminOrderRow,
    type AdminStatus,
} from "@/lib/actions/admin";

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
    // ID refill terakhir per order — cuma disimpan di tab ini (tidak ada kolom DB
    // buat ini), dipakai buat aktifin tombol "Cek refill" setelah refill diminta.
    const [refillIds, setRefillIds] = useState<Record<string, number>>({});

    const rows = useMemo(
        () =>
            orders.filter(
                (o) =>
                    (filter === "all" || o.status === filter) &&
                    (!q.trim() || (o.code + o.username + o.packageLabel).toLowerCase().includes(q.trim().toLowerCase())),
            ),
        [orders, filter, q],
    );

    async function setStatus(orderId: string, status: AdminStatus, currentStatus: AdminStatus) {
        if (status === "fail") {
            // Order yang lagi "Selesai" ditandai gagal itu kasus beda dari yang
            // masih Diproses/Menunggu: kalau order ini SEBELUMNYA pernah gagal lalu
            // (sengaja/kesalahan klik) balik jadi Selesai, saldo pembeli sudah
            // ke-refund sekali di transisi itu — refund kedua di sini bakal dobel.
            const msg =
                currentStatus === "ok"
                    ? "Order ini berstatus Selesai. Yakin mau ditandai Gagal? Saldo pembeli akan dikembalikan lagi — pastikan order ini BELUM pernah direfund sebelumnya (mis. sempat Gagal lalu ke-ubah balik jadi Selesai), supaya saldo tidak kembali dua kali."
                    : "Tandai gagal? Saldo pembeli akan otomatis dikembalikan.";
            if (!window.confirm(msg)) return;
        }
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

    async function checkSmm(orderId: string, providerOrderId: number) {
        setBusyId(orderId);
        const res = await adminCheckSmmOrderAction(orderId, providerOrderId);
        setBusyId(null);
        if (res.error) window.alert(res.error);
        router.refresh();
    }

    async function refillSmm(orderId: string, providerOrderId: number) {
        setBusyId(orderId);
        const res = await adminRefillSmmOrderAction(providerOrderId);
        setBusyId(null);
        if (res.error) {
            window.alert(res.error);
            return;
        }
        if (res.refillId !== undefined) {
            setRefillIds((prev) => ({ ...prev, [orderId]: res.refillId! }));
            window.alert(`Refill diminta ke supplier (ID refill #${res.refillId}).`);
        }
    }

    async function checkRefill(orderId: string) {
        const refillId = refillIds[orderId];
        if (!refillId) return;
        setBusyId(orderId);
        const res = await adminCheckRefillStatusAction(refillId);
        setBusyId(null);
        window.alert(res.error ?? `Status refill #${refillId}: ${res.status}`);
    }

    async function cancelSmm(orderId: string, providerOrderId: number) {
        if (!window.confirm("Batalkan pesanan ini di supplier? Saldo pembeli akan otomatis dikembalikan.")) return;
        setBusyId(orderId);
        const res = await adminCancelSmmOrderAction(orderId, providerOrderId);
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
                                        <td>
                                            {o.provider === "smmflare" ? (
                                                <a href={o.username} target="_blank" rel="noopener noreferrer">
                                                    {o.username}
                                                </a>
                                            ) : (
                                                o.username
                                            )}
                                        </td>
                                        <td>{o.packageLabel}</td>
                                        <td>{rp(o.total)}</td>
                                        <td>
                                            <span className={`d-badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
                                            {o.status === "fail" && o.failReason && (
                                                <div className="mute d-mute-sm">{o.failReason}</div>
                                            )}
                                            {o.provider === "smmflare" && o.providerOrderId !== null ? (
                                                <div className="mute d-mute-xs">smmflare #{o.providerOrderId}</div>
                                            ) : (
                                                o.rscOrderNumber !== null && (
                                                    <div className="mute d-mute-xs">RSC #{o.rscOrderNumber}</div>
                                                )
                                            )}
                                        </td>
                                        <td className="mute">{timeAgo(o.time)}</td>
                                        <td>
                                            <div className="d-order-actions">
                                                {o.provider === "smmflare" && o.providerOrderId !== null && (
                                                    <button
                                                        type="button"
                                                        className="d-pill"
                                                        disabled={busyId === o.id}
                                                        onClick={() => checkSmm(o.id, o.providerOrderId!)}
                                                    >
                                                        ⟳ Cek smmflare
                                                    </button>
                                                )}
                                                {o.provider === "smmflare" && o.providerOrderId !== null && o.status === "ok" && (
                                                    <button
                                                        type="button"
                                                        className="d-pill"
                                                        disabled={busyId === o.id}
                                                        onClick={() => refillSmm(o.id, o.providerOrderId!)}
                                                    >
                                                        ↻ Refill
                                                    </button>
                                                )}
                                                {o.provider === "smmflare" && refillIds[o.id] !== undefined && (
                                                    <button
                                                        type="button"
                                                        className="d-pill"
                                                        disabled={busyId === o.id}
                                                        onClick={() => checkRefill(o.id)}
                                                    >
                                                        ⟳ Cek refill
                                                    </button>
                                                )}
                                                {o.provider === "smmflare" &&
                                                    o.providerOrderId !== null &&
                                                    o.status !== "ok" &&
                                                    o.status !== "fail" && (
                                                        <button
                                                            type="button"
                                                            className="d-pill"
                                                            disabled={busyId === o.id}
                                                            onClick={() => cancelSmm(o.id, o.providerOrderId!)}
                                                        >
                                                            ✕ Batalkan
                                                        </button>
                                                    )}
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
                                                        onClick={() => setStatus(o.id, "ok", o.status)}
                                                    >
                                                        Tandai selesai
                                                    </button>
                                                )}
                                                {o.status !== "fail" && (
                                                    <button
                                                        type="button"
                                                        className="d-pill"
                                                        disabled={busyId === o.id}
                                                        onClick={() => setStatus(o.id, "fail", o.status)}
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