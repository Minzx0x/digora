import { redirect } from "next/navigation";
import AdminStatistik from "@/components/AdminStatistik";
import { getAdminStatsData } from "@/lib/actions/admin-stats";

export default async function AdminStatistikPage() {
    const data = await getAdminStatsData("7d");
    if (!data.isAdmin) redirect("/admin/login");
    return <AdminStatistik initial={data} />;
}
