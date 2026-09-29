"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    getMyTicketsAction,
    getTicketThreadAction,
    createTicketAction,
    replyTicketAction,
    closeTicketAction,
    type TicketRow,
    type TicketMessageRow,
    type TicketStatus,
} from "@/lib/actions/tickets";

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

// Halaman Bantuan: FAQ (BantuanView, Server Component) + komponen ini di
// bawahnya — list tiket lalu detail thread, toggle di client (bukan route
// terpisah), polling 6 detik pas satu thread lagi kebuka biar berasa chat
// tanpa perlu Supabase Realtime (belum pernah dipakai di app ini sama sekali).
export default function TiketView({ tickets: initialTickets }: { tickets: TicketRow[] }) {
    const router = useRouter();
    const [tickets, setTickets] = useState(initialTickets);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [thread, setThread] = useState<TicketMessageRow[]>([]);
    const [loadingThread, setLoadingThread] = useState(false);

    const [reply, setReply] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [showNewForm, setShowNewForm] = useState(false);
    const [newSubject, setNewSubject] = useState("");
    const [newMessage, setNewMessage] = useState("");
    const [creating, setCreating] = useState(false);
    const [err, setErr] = useState("");

    async function refreshTickets() {
        const list = await getMyTicketsAction();
        setTickets(list);
    }

    async function openTicket(id: string) {
        setSelectedId(id);
        setShowNewForm(false);
        setLoadingThread(true);
        const msgs = await getTicketThreadAction(id);
        setThread(msgs);
        setLoadingThread(false);
    }

    useEffect(() => {
        if (!selectedId) return;
        const t = setInterval(() => {
            getTicketThreadAction(selectedId).then(setThread);
        }, 6000);
        return () => clearInterval(t);
    }, [selectedId]);

    async function submitReply(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedId || (!reply.trim() && !file)) return;
        setSending(true);
        const res = await replyTicketAction({ ticketId: selectedId, message: reply.trim(), file });
        setSending(false);
        if (res.error) {
            window.alert(res.error);
            return;
        }
        setReply("");
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        const msgs = await getTicketThreadAction(selectedId);
        setThread(msgs);
        refreshTickets();
        router.refresh();
    }

    async function submitNewTicket(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        if (!newSubject.trim() || !newMessage.trim()) {
            setErr("Isi subjek dan pesan dulu.");
            return;
        }
        setCreating(true);
        const res = await createTicketAction({ subject: newSubject.trim(), message: newMessage.trim() });
        setCreating(false);
        if (res.error) {
            setErr(res.error);
            return;
        }
        setNewSubject("");
        setNewMessage("");
        setShowNewForm(false);
        await refreshTickets();
        if (res.ticketId) openTicket(res.ticketId);
        router.refresh();
    }

    async function doClose() {
        if (!selectedId) return;
        if (!window.confirm("Tutup tiket ini? Kamu tetap bisa balas lagi nanti kalau masih ada kendala.")) return;
        await closeTicketAction(selectedId);
        setTickets((prev) => prev.map((t) => (t.id === selectedId ? { ...t, status: "closed" } : t)));
        router.refresh();
    }

    const selected = tickets.find((t) => t.id === selectedId) ?? null;

    return (
        <section className="d-card">
            <div className="d-card-head">
                <h2>Tiket saya</h2>
                {!selectedId && (
                    <button type="button" className="d-btn" onClick={() => setShowNewForm((s) => !s)}>
                        {showNewForm ? "Batal" : "+ Buat tiket baru"}
                    </button>
                )}
            </div>

            {!selectedId && showNewForm && (
                <form className="u-mini tk-new-form" onSubmit={submitNewTicket}>
                    <label>
                        Subjek
                        <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Ringkasan masalah kamu" />
                    </label>
                    <label>
                        Pesan
                        <textarea
                            rows={4}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Jelasin kendalanya di sini…"
                        />
                    </label>
                    <button className="d-btn" type="submit" disabled={creating}>
                        {creating ? "Mengirim…" : "Kirim tiket"}
                    </button>
                    {err && <div className="u-bad">{err}</div>}
                </form>
            )}

            {!selectedId ? (
                <div className="tk-list">
                    {tickets.length === 0 && <p className="d-note">Belum ada tiket. Buat satu kalau ada kendala.</p>}
                    {tickets.map((t) => (
                        <button type="button" key={t.id} className="tk-list-item" onClick={() => openTicket(t.id)}>
                            <div className="tk-list-top">
                                <b>{t.subject}</b>
                                <span className={`d-badge ${t.status === "open" ? "wait" : "ok"}`}>{STATUS_LABEL[t.status]}</span>
                            </div>
                            {t.lastMessage && <p className="mute d-mute-sm tk-list-preview">{t.lastMessage}</p>}
                            <span className="mute d-mute-xs">{timeAgo(t.lastMessageAt)}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="tk-thread">
                    <div className="tk-thread-head">
                        <button type="button" className="d-see-all" onClick={() => setSelectedId(null)}>
                            ← Kembali
                        </button>
                        <b>{selected?.subject}</b>
                        {selected?.status === "open" && (
                            <button type="button" className="d-pill solid" onClick={doClose}>
                                Tutup tiket
                            </button>
                        )}
                    </div>

                    <div className="tk-bubbles">
                        {loadingThread && <p className="d-note">Memuat…</p>}
                        {thread.map((m) => (
                            <div key={m.id} className={`tk-bubble ${m.isAdmin ? "admin" : "me"}`}>
                                {m.attachmentUrl && (
                                    <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                                        <img src={m.attachmentUrl} alt="Lampiran" className="tk-bubble-img" />
                                    </a>
                                )}
                                {m.message && <p>{m.message}</p>}
                                <span>{m.isAdmin ? "Admin" : "Kamu"} · {timeAgo(m.createdAt)}</span>
                            </div>
                        ))}
                    </div>

                    {selected?.status === "closed" ? (
                        <div className="tk-closed-cta">
                            <p className="d-note">Tiket ini sudah ditutup dan tidak bisa dibalas lagi.</p>
                            <button
                                type="button"
                                className="d-btn"
                                onClick={() => {
                                    setSelectedId(null);
                                    setShowNewForm(true);
                                }}
                            >
                                + Buat tiket baru
                            </button>
                        </div>
                    ) : (
                        <>
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
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFile(null);
                                            if (fileInputRef.current) fileInputRef.current.value = "";
                                        }}
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
