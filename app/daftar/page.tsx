import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";

export const metadata: Metadata = { title: "Daftar — Digora" };

export default function DaftarPage() {
    return <AuthShell initial="register" />;
}