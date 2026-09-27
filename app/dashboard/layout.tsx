import type { Metadata } from "next";
import "./dashboard.css";

export const metadata: Metadata = {
    title: "Dashboard — Digora",
    robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <div className="dash-page">{children}</div>;
}