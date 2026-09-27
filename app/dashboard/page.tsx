import UserDashboard from "@/components/UserDashboard";
import { getDashboardData } from "@/lib/actions/data";
import { getCatalog } from "@/lib/actions/catalog";

export default async function DashboardPage() {
    const [data, catalog] = await Promise.all([getDashboardData(), getCatalog()]);
    return <UserDashboard initial={data} catalog={catalog} />;
}