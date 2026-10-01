"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/actions/admin";

export type AdminBlogPostRow = {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImageUrl: string | null;
    published: boolean;
    viewCount: number;
    createdAt: string;
    updatedAt: string;
};

function mapRow(r: Record<string, unknown>): AdminBlogPostRow {
    return {
        id: r.id as string,
        slug: r.slug as string,
        title: r.title as string,
        excerpt: r.excerpt as string,
        content: r.content as string,
        coverImageUrl: (r.cover_image_url as string | null) ?? null,
        published: !!r.published,
        viewCount: Number(r.view_count ?? 0),
        createdAt: r.created_at as string,
        updatedAt: r.updated_at as string,
    };
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const COVER_BUCKET = "blog-covers";
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Nama file UUID acak (bukan ikut ID artikel) -- artikel baru belum punya ID
// pas gambar sampulnya diupload duluan (lihat supabase/blog.sql).
export async function uploadBlogCoverAction(file: File): Promise<{ url: string | null; error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { url: null, error: "Bukan admin." };
    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
        return { url: null, error: "Format gambar tidak didukung (cuma JPEG/PNG/WEBP/GIF)." };
    }
    if (file.size > MAX_COVER_BYTES) return { url: null, error: "Ukuran gambar maksimal 5MB." };

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : file.type === "image/gif" ? "gif" : "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(COVER_BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) return { url: null, error: "Gagal upload gambar." };

    const { data: pub } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
    return { url: pub.publicUrl, error: null };
}

export async function getAdminBlogPosts(): Promise<{ isAdmin: boolean; posts: AdminBlogPostRow[] }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { isAdmin: false, posts: [] };
    const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, content, cover_image_url, published, view_count, created_at, updated_at")
        .order("created_at", { ascending: false });
    return { isAdmin: true, posts: (data ?? []).map(mapRow) };
}

export async function getAdminBlogPost(id: string): Promise<AdminBlogPostRow | null> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return null;
    const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, content, cover_image_url, published, view_count, created_at, updated_at")
        .eq("id", id)
        .maybeSingle();
    return data ? mapRow(data) : null;
}

export type BlogPostInput = {
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    coverImageUrl: string;
    published: boolean;
};

function validate(input: BlogPostInput): string | null {
    if (!input.title.trim()) return "Judul wajib diisi.";
    if (!SLUG_RE.test(input.slug)) return "Slug cuma boleh huruf kecil, angka, dan tanda strip (mis. cara-naikin-followers-ig).";
    if (!input.content.trim()) return "Isi artikel wajib diisi.";
    return null;
}

export async function createBlogPostAction(input: BlogPostInput): Promise<{ error: string | null; id?: string }> {
    const err = validate(input);
    if (err) return { error: err };
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };

    const { data, error } = await supabase
        .from("blog_posts")
        .insert({
            slug: input.slug,
            title: input.title.trim(),
            excerpt: input.excerpt.trim(),
            content: input.content,
            cover_image_url: input.coverImageUrl.trim() || null,
            published: input.published,
        })
        .select("id")
        .single();
    if (error) {
        if (error.message.toLowerCase().includes("duplicate")) return { error: "Slug ini sudah dipakai artikel lain." };
        return { error: "Gagal menyimpan. Pastikan akun ini admin." };
    }
    revalidatePath("/admin/blog", "layout");
    revalidatePath("/blog", "layout");
    return { error: null, id: data?.id };
}

export async function updateBlogPostAction(id: string, input: BlogPostInput): Promise<{ error: string | null }> {
    const err = validate(input);
    if (err) return { error: err };
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };

    const { error } = await supabase
        .from("blog_posts")
        .update({
            slug: input.slug,
            title: input.title.trim(),
            excerpt: input.excerpt.trim(),
            content: input.content,
            cover_image_url: input.coverImageUrl.trim() || null,
            published: input.published,
        })
        .eq("id", id);
    if (error) {
        if (error.message.toLowerCase().includes("duplicate")) return { error: "Slug ini sudah dipakai artikel lain." };
        return { error: "Gagal menyimpan. Pastikan akun ini admin." };
    }
    revalidatePath("/admin/blog", "layout");
    revalidatePath("/blog", "layout");
    return { error: null };
}

export async function deleteBlogPostAction(id: string): Promise<{ error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };
    const { error } = await supabase.from("blog_posts").delete().eq("id", id);
    if (error) return { error: "Gagal menghapus. Pastikan akun ini admin." };
    revalidatePath("/admin/blog", "layout");
    revalidatePath("/blog", "layout");
    return { error: null };
}

export async function setBlogPostPublishedAction(id: string, published: boolean): Promise<{ error: string | null }> {
    const { supabase, ok } = await requireAdmin();
    if (!ok) return { error: "Bukan admin." };
    const { error } = await supabase.from("blog_posts").update({ published }).eq("id", id);
    if (error) return { error: "Gagal menyimpan. Pastikan akun ini admin." };
    revalidatePath("/admin/blog", "layout");
    revalidatePath("/blog", "layout");
    return { error: null };
}
