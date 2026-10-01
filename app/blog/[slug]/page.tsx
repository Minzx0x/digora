import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import Brand from "@/components/Brand";
import { getBlogPostBySlug, recordBlogView } from "@/lib/actions/blog";
import "../blog.css";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
    const { slug } = await params;
    const post = await getBlogPostBySlug(slug);
    if (!post) return { title: "Artikel tidak ditemukan — Digora" };
    return {
        title: `${post.title} — Digora`,
        description: post.excerpt || undefined,
        openGraph: {
            title: post.title,
            description: post.excerpt || undefined,
            images: post.coverImageUrl ? [post.coverImageUrl] : undefined,
            type: "article",
        },
    };
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const post = await getBlogPostBySlug(slug);
    if (!post) notFound();
    // DI-AWAIT (bukan fire-and-forget) -- di serverless function (Vercel dkk),
    // promise yang nggak ditunggu bisa ke-cut begitu response-nya selesai
    // dikirim, jadi counter-nya nggak reliable kalau nggak di-await.
    await recordBlogView(slug);

    return (
        <main className="blog-page">
            <div className="blog-top">
                <Brand />
                <a className="blog-back" href="/blog">
                    ← Semua artikel
                </a>
            </div>

            <article className="blog-post-card">
                {post.coverImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="blog-post-cover" src={post.coverImageUrl} alt="" />
                )}
                <p className="blog-post-date">{formatDate(post.createdAt)}</p>
                <h1>{post.title}</h1>
                <div className="blog-prose">
                    <ReactMarkdown>{post.content}</ReactMarkdown>
                </div>
            </article>
        </main>
    );
}
