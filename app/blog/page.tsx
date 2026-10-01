import type { Metadata } from "next";
import Brand from "@/components/Brand";
import { getPublishedBlogPosts } from "@/lib/actions/blog";
import "./blog.css";

export const metadata: Metadata = {
    title: "Blog — Digora",
    description: "Tips & panduan seputar Telegram Stars/Premium dan SMM Panel (followers, likes, views) dari Digora.",
};

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPage() {
    const posts = await getPublishedBlogPosts();

    return (
        <main className="blog-page">
            <div className="blog-top">
                <Brand />
                <a className="blog-back" href="/">
                    ← Kembali ke beranda
                </a>
            </div>

            <div className="blog-wrap">
                <div className="blog-head">
                    <h1>Blog Digora</h1>
                    <p>Tips, panduan, dan kabar seputar Telegram Stars/Premium dan SMM Panel.</p>
                </div>

                {posts.length === 0 ? (
                    <p className="blog-empty">Belum ada artikel. Cek lagi nanti.</p>
                ) : (
                    <div className="blog-grid">
                        {posts.map((p) => (
                            <a key={p.id} className="blog-card" href={`/blog/${p.slug}`}>
                                {p.coverImageUrl && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img className="blog-card-cover" src={p.coverImageUrl} alt="" />
                                )}
                                <div className="blog-card-body">
                                    <span className="blog-card-date">{formatDate(p.createdAt)}</span>
                                    <h2 className="blog-card-title">{p.title}</h2>
                                    {p.excerpt && <p className="blog-card-excerpt">{p.excerpt}</p>}
                                    <span className="blog-card-link">Baca selengkapnya →</span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
