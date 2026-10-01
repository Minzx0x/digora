import { redirect, notFound } from "next/navigation";
import AdminBlogForm from "@/components/AdminBlogForm";
import { getAdminBlogPost } from "@/lib/actions/admin-blog";
import { requireAdmin } from "@/lib/actions/admin";

export default async function AdminBlogEditPage({ params }: { params: Promise<{ id: string }> }) {
    const { ok } = await requireAdmin();
    if (!ok) redirect("/admin/login");
    const { id } = await params;
    const post = await getAdminBlogPost(id);
    if (!post) notFound();
    return <AdminBlogForm initial={post} />;
}
