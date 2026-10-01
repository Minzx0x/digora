"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import AdminSidebar from "./AdminSidebar";
import Toast from "./Toast";
import { useConfirm } from "./useConfirm";
import {
    createBlogPostAction,
    updateBlogPostAction,
    deleteBlogPostAction,
    uploadBlogCoverAction,
    type AdminBlogPostRow,
    type BlogPostInput,
} from "@/lib/actions/admin-blog";

function slugify(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

export default function AdminBlogForm({ initial }: { initial?: AdminBlogPostRow }) {
    const router = useRouter();
    const editing = !!initial;

    const [title, setTitle] = useState(initial?.title ?? "");
    const [slug, setSlug] = useState(initial?.slug ?? "");
    const [slugTouched, setSlugTouched] = useState(editing); // artikel lama: slug jangan auto-ganti ikut judul
    const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
    const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
    const [content, setContent] = useState(initial?.content ?? "");
    const [published, setPublished] = useState(initial?.published ?? false);
    const [preview, setPreview] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState("");
    const [toast, setToast] = useState<{ text: string; kind: "success" | "error" } | null>(null);
    const { confirm, dialog } = useConfirm();

    async function onCoverSelected(file: File | undefined) {
        if (!file) return;
        setUploadingCover(true);
        const res = await uploadBlogCoverAction(file);
        setUploadingCover(false);
        if (res.error || !res.url) {
            setErr(res.error ?? "Gagal upload gambar.");
            return;
        }
        setCoverImageUrl(res.url);
    }

    function onTitleChange(v: string) {
        setTitle(v);
        if (!slugTouched) setSlug(slugify(v));
    }

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setErr("");
        const input: BlogPostInput = { slug, title, excerpt, content, coverImageUrl, published };
        setSaving(true);
        const res = editing ? await updateBlogPostAction(initial!.id, input) : await createBlogPostAction(input);
        setSaving(false);
        if (res.error) {
            setErr(res.error);
            return;
        }
        if (editing) {
            setToast({ text: "Tersimpan.", kind: "success" });
            router.refresh();
        } else {
            router.push("/admin/blog");
            router.refresh();
        }
    }

    async function doDelete() {
        if (!initial) return;
        if (!(await confirm(`Hapus artikel "${initial.title}"? Ini nggak bisa dibatalin.`, { tone: "danger", confirmLabel: "Ya, hapus" })))
            return;
        setSaving(true);
        const res = await deleteBlogPostAction(initial.id);
        setSaving(false);
        if (res.error) {
            setErr(res.error);
            return;
        }
        router.push("/admin/blog");
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
                        <h1 className="d-hi">{editing ? "Edit artikel" : "Tulis artikel baru"}</h1>
                        <p className="d-sub">{editing ? `/blog/${initial!.slug}` : "Isi semua bagian, lalu simpan sebagai draf atau langsung terbitkan."}</p>
                    </div>
                </header>

                <section className="d-card">
                    <form className="u-mini" onSubmit={submit}>
                        <label>
                            Judul
                            <input value={title} onChange={(e) => onTitleChange(e.target.value)} placeholder="Judul artikel" required />
                        </label>
                        <label>
                            Slug (URL)
                            <input
                                value={slug}
                                onChange={(e) => {
                                    setSlug(slugify(e.target.value));
                                    setSlugTouched(true);
                                }}
                                placeholder="cara-naikin-followers-instagram"
                                required
                            />
                        </label>
                        <label>
                            Ringkasan singkat
                            <textarea
                                rows={2}
                                value={excerpt}
                                onChange={(e) => setExcerpt(e.target.value)}
                                placeholder="1-2 kalimat yang muncul di daftar artikel"
                            />
                        </label>
                        <label>
                            Gambar sampul (opsional)
                            <input
                                ref={coverInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                hidden
                                onChange={(e) => onCoverSelected(e.target.files?.[0])}
                            />
                            {coverImageUrl ? (
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={coverImageUrl}
                                        alt=""
                                        style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 10 }}
                                    />
                                    <button type="button" className="d-pill" disabled={uploadingCover} onClick={() => coverInputRef.current?.click()}>
                                        {uploadingCover ? "Mengupload…" : "Ganti gambar"}
                                    </button>
                                    <button type="button" className="d-pill" onClick={() => setCoverImageUrl("")}>
                                        Hapus
                                    </button>
                                </div>
                            ) : (
                                <button type="button" className="d-pill" disabled={uploadingCover} onClick={() => coverInputRef.current?.click()}>
                                    {uploadingCover ? "Mengupload…" : "📷 Upload gambar"}
                                </button>
                            )}
                        </label>

                        <div className="d-card-head" style={{ margin: 0 }}>
                            <label style={{ margin: 0 }}>Isi artikel (Markdown)</label>
                            <button type="button" className="d-pill" onClick={() => setPreview((p) => !p)}>
                                {preview ? "Tulis" : "Pratinjau"}
                            </button>
                        </div>
                        {preview ? (
                            <div className="blog-prose u-blog-preview">
                                <ReactMarkdown>{content || "*Belum ada isi.*"}</ReactMarkdown>
                            </div>
                        ) : (
                            <textarea
                                rows={16}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder={"Tulis isi artikel pakai Markdown, mis.\n\n## Subjudul\n\nTeks biasa, **tebal**, [link](https://...)."}
                                style={{ fontFamily: "monospace" }}
                                required
                            />
                        )}

                        <label style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 13 }}>
                            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
                            Terbitkan (kalau dimatikan, tersimpan sebagai draf)
                        </label>

                        <div className="d-order-actions">
                            <button className="d-btn" type="submit" disabled={saving}>
                                {saving ? "Menyimpan…" : "Simpan"}
                            </button>
                            {editing && (
                                <button type="button" className="d-pill solid" disabled={saving} onClick={doDelete}>
                                    Hapus artikel
                                </button>
                            )}
                        </div>
                        {err && <div className="u-bad">{err}</div>}
                    </form>
                </section>
            </main>
        </div>
    );
}
