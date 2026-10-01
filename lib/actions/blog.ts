"use server";

import { createClient } from "@/lib/supabase/server";

export type BlogPostRow = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImageUrl: string | null;
    createdAt: string;
    updatedAt: string;
};

function mapRow(r: Record<string, unknown>): BlogPostRow {
    return {
        id: r.id as string,
        slug: r.slug as string,
        title: r.title as string,
        excerpt: r.excerpt as string,
        content: r.content as string,
        coverImageUrl: (r.cover_image_url as string | null) ?? null,
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

// RLS blog_posts_select ("published = true or is_admin()") yang nyaring --
// pengunjung publik (anon, bukan admin) otomatis cuma kebaca yang published.
export async function getPublishedBlogPosts(): Promise<BlogPostRow[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, content, cover_image_url, created_at, updated_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
    // Kalau query gagal (mis. tabel belum ada karena migrasi SQL belum
    // dijalankan), JANGAN diam-diam dianggap "belum ada artikel" -- log biar
    // ketahuan dari terminal server, sama pola dengan getSmmCatalog.
    if (error) console.error("[blog] getPublishedBlogPosts gagal select blog_posts:", error.message);
    return (data ?? []).map(mapRow);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPostRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, content, cover_image_url, created_at, updated_at")
        .eq("slug", slug)
        .maybeSingle();
    if (error) console.error("[blog] getBlogPostBySlug gagal select blog_posts:", error.message);
    return data ? mapRow(data) : null;
}

// Counter "dilihat berapa kali" sederhana (bukan unique visitor) -- RPC-nya
// sendiri sudah nyaring cuma artikel published yang kehitung (lihat
// increment_blog_view di supabase/blog.sql), jadi aman dipanggil apa adanya
// tiap kali halaman /blog/[slug] dibuka. Gagal diam-diam (nggak perlu bikin
// halaman error cuma gara-gara counter gagal nambah).
export async function recordBlogView(slug: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("increment_blog_view", { p_slug: slug });
    if (error) console.error("[blog] recordBlogView gagal:", error.message);
}
