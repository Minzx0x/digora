import { redirect } from "next/navigation";
import AdminBlog from "@/components/AdminBlog";
import { getAdminBlogPosts } from "@/lib/actions/admin-blog";

export default async function AdminBlogPage() {
    const { isAdmin, posts } = await getAdminBlogPosts();
    if (!isAdmin) redirect("/admin/login");
    return <AdminBlog posts={posts} />;
}
