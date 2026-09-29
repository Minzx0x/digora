import { redirect } from "next/navigation";
import AdminTiket from "@/components/AdminTiket";
import { getAdminTicketsData } from "@/lib/actions/admin-tickets";

export default async function AdminTiketPage() {
    const data = await getAdminTicketsData();
    if (!data.isAdmin) redirect("/admin/login");
    return <AdminTiket tickets={data.tickets} />;
}
