import { redirect } from "next/navigation";
import AdminSettings from "@/components/AdminSettings";
import { getSettingsData } from "@/lib/actions/admin";

export default async function AdminPengaturanPage() {
    const data = await getSettingsData();
    if (!data.isAdmin) redirect("/admin/login");
    return <AdminSettings data={data} />;
}