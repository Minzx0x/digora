"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Brand from "./Brand";
import { adminSignInAction } from "@/lib/actions/auth";

export default function AdminLoginForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [alert, setAlert] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const email = String(f.get("email") ?? "").trim();
        const password = String(f.get("password") ?? "");
        setAlert(null);
        setLoading(true);
        const res = await adminSignInAction(email, password);
        setLoading(false);
        if (res.error) {
            setAlert(res.error);
            return;
        }
        const next = new URLSearchParams(window.location.search).get("next");
        router.push(next || "/admin");
        router.refresh();
    }

    return (
        <div className="admin-login">
            <div className="admin-login-card">
                <div className="admin-login-brand">
                    <Brand light />
                </div>
                <h1>Admin Digora</h1>
                <p>Khusus tim internal. Masuk pakai akun admin kamu.</p>

                <form onSubmit={onSubmit} noValidate>
                    {alert && <div className="admin-login-alert">{alert}</div>}
                    <label>
                        Email
                        <input name="email" type="email" placeholder="admin@digora.com" autoComplete="username" required />
                    </label>
                    <label>
                        Password
                        <input name="password" type="password" placeholder="Password admin" autoComplete="current-password" required />
                    </label>
                    <button type="submit" disabled={loading}>
                        {loading ? "Memproses…" : "Masuk sebagai admin"}
                    </button>
                </form>

                <a className="admin-login-back" href="/">← Kembali ke Digora</a>
            </div>
        </div>
    );
}