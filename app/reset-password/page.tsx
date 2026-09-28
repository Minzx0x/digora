import type { Metadata } from "next";
import "@/components/auth.css";
import { createClient } from "@/lib/supabase/server";
import ResetPasswordForm from "@/components/ResetPasswordForm";

export const metadata: Metadata = { title: "Buat Password Baru — Digora" };

export default async function ResetPasswordPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

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
                        {user ? (
                            <ResetPasswordForm />
                        ) : (
                            // Kesini tanpa lewat link email (atau link-nya sudah kadaluarsa/
                            // sudah pernah dipakai) — sesi pemulihan dari app/auth/callback
                            // gak kebentuk, jadi gak ada cara aman buat ganti password di sini.
                            <>
                                <h1 className="auth-title">Link kadaluarsa</h1>
                                <p className="auth-sub">
                                    Link reset password ini sudah tidak berlaku atau sudah pernah dipakai. Minta link baru lewat
                                    halaman lupa password.
                                </p>
                                <p className="auth-alt">
                                    <a href="/lupa-password">Minta link baru</a>
                                </p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}