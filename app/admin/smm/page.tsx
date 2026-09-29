import { Suspense } from "react";
import { redirect } from "next/navigation";
import AdminSmmCatalog from "@/components/AdminSmmCatalog";
import SmmflareBalanceCard from "@/components/SmmflareBalanceCard";
import { getSmmAdminData } from "@/lib/actions/admin-smm";

function BalanceSkeleton() {
    return (
        <div className="d-balance">
            <div className="skel" style={{ width: 120, height: 12, marginBottom: 12 }} />
            <div className="skel" style={{ width: 160, height: 28 }} />
        </div>
    );
}

export default async function AdminSmmPage() {
    const data = await getSmmAdminData();
    if (!data.isAdmin) redirect("/admin/login");
    return (
        <AdminSmmCatalog
            services={data.services}
            balanceSlot={
                <Suspense fallback={<BalanceSkeleton />}>
                    <SmmflareBalanceCard usdIdrRate={data.usdIdrRate} />
                </Suspense>
            }
        />
    );
}
