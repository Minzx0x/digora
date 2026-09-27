import type { Metadata } from "next";
import AdminLoginForm from "@/components/AdminLoginForm";

export const metadata: Metadata = {
    title: "Masuk Admin — Digora",
    robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
    return <AdminLoginForm />;
}