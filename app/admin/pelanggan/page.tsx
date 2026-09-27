import { redirect } from "next/navigation";
import AdminCustomers from "@/components/AdminCustomers";
import { getCustomersData } from "@/lib/actions/admin";

export default async function AdminPelangganPage() {
    const { isAdmin, customers } = await getCustomersData();
    if (!isAdmin) redirect("/admin/login");
    return <AdminCustomers customers={customers} />;
}