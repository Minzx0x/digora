"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminSidebar from "./AdminSidebar";
import Toast from "./Toast";
import { useConfirm } from "./useConfirm";
import { deleteBlogPostAction, setBlogPostPublishedAction, type AdminBlogPostRow } from "@/lib/actions/admin-blog";

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

export default function AdminBlog({ posts }: { posts: AdminBlogPostRow[] }) {
    const router = useRouter();
    const [busyId, setBusyId] = useState<string | null>(null);
    const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);
    const { confirm, dialog } = useConfirm();

    async function togglePublish(id: string, published: boolean) {
        setBusyId(id);
        const res = await setBlogPostPublishedAction(id, published);
        setBusyId(null);
        if (res.error) {
            setToast({ text: res.error, kind: "error" });
            return;
        }
        router.refresh();
    }

    async function doDelete(id: string, title: string) {
        if (!(await confirm(`Hapus artikel "${title}"? Ini nggak bisa dibatalin.`, { tone: "danger", confirmLabel: "Ya, hapus" }))) return;
        setBusyId(id);
        const res = await deleteBlogPostAction(id);
        setBusyId(null);
        if (res.error) {
            setToast({ text: res.error, kind: "error" });
            return;
        }
        router.refresh();
    }

    return (
        <div className="dash">
            {toast && <Toast message={toast.text} kind={toast.kind} onDone={() => setToast(null)} />}
            {dialog}
            <AdminSidebar active="blog" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Blog</h1>
                        <p className="d-sub">Tulis & kelola artikel yang tampil di digora.codes/blog.</p>
                    </div>
                    <Link className="d-btn" href="/admin/blog/baru">
                        + Tulis artikel baru
                    </Link>
                </header>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Semua artikel ({posts.length})</h2>
                    </div>

                    <div className="tk-list">
                        {posts.length === 0 && <p className="d-note">Belum ada artikel. Tulis yang pertama lewat tombol di atas.</p>}
                        {posts.map((p) => (
                            <div className="tk-list-item" key={p.id} style={{ cursor: "default" }}>
                                <div className="tk-list-top">
                                    <b>{p.title}</b>
                                    <span className={`d-badge ${p.published ? "ok" : "wait"}`}>{p.published ? "Terbit" : "Draf"}</span>
                                </div>
                                <p className="mute d-mute-sm tk-list-preview">/blog/{p.slug}</p>
                                <span className="mute d-mute-xs">
                                    👁 {p.viewCount.toLocaleString("id-ID")} dilihat · Diubah {timeAgo(p.updatedAt)}
                                </span>
                                <div className="d-order-actions" style={{ marginTop: 10 }}>
                                    <Link className="d-pill solid" href={`/admin/blog/${p.id}`}>
                                        Edit
                                    </Link>
                                    <button
                                        type="button"
                                        className="d-pill solid"
                                        disabled={busyId === p.id}
                                        onClick={() => togglePublish(p.id, !p.published)}
                                    >
                                        {p.published ? "Jadikan draf" : "Terbitkan"}
                                    </button>
                                    <button
                                        type="button"
                                        className="d-pill solid"
                                        disabled={busyId === p.id}
                                        onClick={() => doDelete(p.id, p.title)}
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
}
