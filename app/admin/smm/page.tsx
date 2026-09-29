import { redirect } from "next/navigation";
import AdminSmmCatalog from "@/components/AdminSmmCatalog";
import { getSmmAdminData } from "@/lib/actions/admin-smm";

export default async function AdminSmmPage() {
    const data = await getSmmAdminData();
    if (!data.isAdmin) redirect("/admin/login");
    return <AdminSmmCatalog services={data.services} />;
}
