import type { Metadata } from "next";
import "../dashboard/dashboard.css";

export const metadata: Metadata = {
    title: "Admin — Digora",
    robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <div className="dash-page">{children}</div>;
}