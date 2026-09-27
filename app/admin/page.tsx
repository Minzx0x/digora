import DashboardView from "@/components/DashboardView";
import { getAdminData } from "@/lib/actions/admin";

// Dashboard admin: stok Stars, semua pesanan — data asli dari Supabase.
// Proteksi role admin sudah ditangani di lib/supabase/middleware.ts (proxy.ts).
export default async function AdminPage() {
    const data = await getAdminData();
    return <DashboardView data={data} />;
}