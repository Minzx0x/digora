"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import Toast from "./Toast";
import {
    getAdminTicketsData,
    getAdminTicketThreadAction,
    adminReplyTicketAction,
    adminSetTicketStatusAction,
    type AdminTicketRow,
} from "@/lib/actions/admin-tickets";
import type { TicketMessageRow, TicketStatus } from "@/lib/actions/tickets";

const STATUS_LABEL: Record<TicketStatus, string> = { open: "Terbuka", closed: "Ditutup" };

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

export default function AdminTiket({ tickets: initialTickets }: { tickets: AdminTicketRow[] }) {
    const router = useRouter();
    const [tickets, setTickets] = useState(initialTickets);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [thread, setThread] = useState<TicketMessageRow[]>([]);
    const [loadingThread, setLoadingThread] = useState(false);

    const [reply, setReply] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [busyStatus, setBusyStatus] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function refreshTickets() {
        const res = await getAdminTicketsData();
        setTickets(res.tickets);
    }

    async function openTicket(id: string) {
        setSelectedId(id);
        setLoadingThread(true);
        const msgs = await getAdminTicketThreadAction(id);
        setThread(msgs);
        setLoadingThread(false);
    }

    useEffect(() => {
        if (!selectedId) return;
        const t = setInterval(() => {
            getAdminTicketThreadAction(selectedId).then(setThread);
        }, 6000);
        return () => clearInterval(t);
    }, [selectedId]);

    async function submitReply(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedId || (!reply.trim() && !file)) return;
        setSending(true);
        const res = await adminReplyTicketAction({ ticketId: selectedId, message: reply.trim(), file });
        setSending(false);
        if (res.error) {
            setErr(res.error);
            return;
        }
        setReply("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        const msgs = await getAdminTicketThreadAction(selectedId);
        setThread(msgs);
        refreshTickets();
        router.refresh();
    }

    async function toggleStatus() {
        if (!selectedId || !selected) return;
        const next: TicketStatus = selected.status === "open" ? "closed" : "open";
        setBusyStatus(true);
        await adminSetTicketStatusAction(selectedId, next);
        setBusyStatus(false);
        setTickets((prev) => prev.map((t) => (t.id === selectedId ? { ...t, status: next } : t)));
        router.refresh();
    }

    const selected = tickets.find((t) => t.id === selectedId) ?? null;
    const openCount = tickets.filter((t) => t.status === "open").length;

    return (
        <div className="dash">
            {err && <Toast message={err} kind="error" onDone={() => setErr(null)} />}
            <AdminSidebar active="tiket" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Tiket Support</h1>
                        <p className="d-sub">Tiket bantuan dari pelanggan.</p>
                    </div>
                </header>

                <section className="d-card">
                    {!selectedId ? (
                        <>
                            <div className="d-card-head">
                                <h2>Semua tiket</h2>
                                <span className="mute d-mute-sm">{openCount} terbuka</span>
                            </div>
                            <div className="tk-list">
                                {tickets.length === 0 && <p className="d-note">Belum ada tiket masuk.</p>}
                                {tickets.map((t) => (
                                    <button type="button" key={t.id} className="tk-list-item" onClick={() => openTicket(t.id)}>
                                        <div className="tk-list-top">
                                            <b>{t.subject}</b>
                                            <span className={`d-badge ${t.status === "open" ? "wait" : "ok"}`}>{STATUS_LABEL[t.status]}</span>
                                        </div>
                                        <p className="mute d-mute-sm">
                                            {t.userName} · {t.userEmail}
                                        </p>
                                        {(t.category || t.orderId) && (
                                            <p className="mute d-mute-xs">
                                                {[t.category, t.subcategory].filter(Boolean).join(" · ")}
                                                {t.orderId ? ` · Order ID: ${t.orderId}` : ""}
                                            </p>
                                        )}
                                        {t.lastMessage && <p className="mute d-mute-sm tk-list-preview">{t.lastMessage}</p>}
                                        <span className="mute d-mute-xs">{timeAgo(t.lastMessageAt)}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="tk-thread">
                            <div className="tk-thread-head">
                                <button type="button" className="d-see-all" onClick={() => setSelectedId(null)}>
                                    ← Kembali
                                </button>
                                <div className="tk-thread-title">
                                    <b>{selected?.subject}</b>
                                    <span className="mute d-mute-xs">
                                        {selected?.userName} · {selected?.userEmail}
                                    </span>
                                    {selected?.orderId && <span className="mute d-mute-xs">Order ID: {selected.orderId}</span>}
                                </div>
                                <button type="button" className="d-pill solid" onClick={toggleStatus} disabled={busyStatus}>
                                    {selected?.status === "open" ? "Tutup tiket" : "Buka lagi"}
                                </button>
                            </div>

                            <div className="tk-bubbles">
                                {loadingThread && <p className="d-note">Memuat…</p>}
                                {thread.map((m) => (
                                    <div key={m.id} className={`tk-bubble ${m.isAdmin ? "me" : "admin"}`}>
                                        {m.attachmentUrl && (
                                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                                                <img src={m.attachmentUrl} alt="Lampiran" className="tk-bubble-img" />
                                            </a>
                                        )}
                                        {m.message && <p>{m.message}</p>}
                                        <span>{m.isAdmin ? "Admin" : "Pelanggan"} · {timeAgo(m.createdAt)}</span>
                                    </div>
                                ))}
                            </div>

                            <form className="tk-reply" onSubmit={submitReply}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    hidden
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                />
                                <button
                                    type="button"
                                    className="tk-attach-btn"
                                    aria-label="Lampirkan foto"
                                    title="Lampirkan foto"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    📎
                                </button>
                                <input
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    placeholder="Tulis balasan…"
                                    aria-label="Tulis balasan"
                                />
                                <button className="d-btn" type="submit" disabled={sending || (!reply.trim() && !file)}>
                                    {sending ? "…" : "Kirim"}
                                </button>
                            </form>
                            {file && (
                                <div className="tk-attach-preview">
                                    <span>📷 {file.name}</span>
                                    <button type="button" aria-label="Hapus lampiran" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
