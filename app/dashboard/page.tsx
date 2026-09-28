import { redirect } from "next/navigation";

// /dashboard sendiri bukan halaman — cuma pintu masuk yang diteruskan ke
// /dashboard/beranda (route asli, lihat app/dashboard/beranda/page.tsx).
export default function DashboardPage() {
    redirect("/dashboard/beranda");
}