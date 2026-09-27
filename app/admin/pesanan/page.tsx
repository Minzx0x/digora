import { redirect } from "next/navigation";
import AdminOrders from "@/components/AdminOrders";
import { getAllOrdersData } from "@/lib/actions/admin";

// Proteksi role admin utama sudah di lib/supabase/middleware.ts (proxy.ts);
// redirect di sini cuma jaga-jaga kedua kalau data ternyata bukan punya admin.
export default async function AdminPesananPage() {
    const { isAdmin, orders } = await getAllOrdersData();
    if (!isAdmin) redirect("/admin/login");
    return <AdminOrders orders={orders} />;
}