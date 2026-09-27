import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell";

export const metadata: Metadata = { title: "Masuk — Digora" };

export default function LoginPage() {
    return <AuthShell initial="login" />;
}