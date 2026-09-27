import { redirect } from "next/navigation";
import AdminPackages from "@/components/AdminPackages";
import { getPaketData } from "@/lib/actions/admin";

export default async function AdminPaketPage() {
    const data = await getPaketData();
    if (!data.isAdmin) redirect("/admin/login");
    return <AdminPackages data={data} />;
}