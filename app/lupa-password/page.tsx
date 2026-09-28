import type { Metadata } from "next";
import "@/components/auth.css";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

export const metadata: Metadata = { title: "Lupa Password — Digora" };

export default function LupaPasswordPage() {
    return (
        <main className="auth-page">
            <div className="auth-solo">
                <div className="auth-top">
                    <a className="auth-back" href="/login">
                        ← Kembali ke login
                    </a>
                </div>
                <div className="auth-center">
                    <div className="auth-box">
                        <ForgotPasswordForm />
                    </div>
                </div>
            </div>
        </main>
    );
}