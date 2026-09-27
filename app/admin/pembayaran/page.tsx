import { redirect } from "next/navigation";
import AdminPayments from "@/components/AdminPayments";
import { getPaymentsData } from "@/lib/actions/admin";

export default async function AdminPembayaranPage() {
    const { isAdmin, payments } = await getPaymentsData();
    if (!isAdmin) redirect("/admin/login");
    return <AdminPayments payments={payments} />;
}