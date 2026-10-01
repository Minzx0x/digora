import { redirect } from "next/navigation";
import AdminBlogForm from "@/components/AdminBlogForm";
import { requireAdmin } from "@/lib/actions/admin";

export default async function AdminBlogNewPage() {
    const { ok } = await requireAdmin();
    if (!ok) redirect("/admin/login");
    return <AdminBlogForm />;
}
