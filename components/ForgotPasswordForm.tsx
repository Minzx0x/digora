"use client";

import { useState } from "react";
import { requestPasswordResetAction } from "@/lib/actions/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordForm() {
    const [email, setEmail] = useState("");
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const v = email.trim();
        if (!EMAIL_RE.test(v)) {
            setErr("Format email belum benar.");
            return;
        }
        setErr("");
        setLoading(true);
        try {
            const { error } = await requestPasswordResetAction(v);
            if (error) {
                setErr(error);
                return;
            }
            setSent(true);
        } catch {
            setErr("Tidak bisa terhubung ke server. Coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    if (sent) {
        return (
            <>
                <h1 className="auth-title">Cek email kamu</h1>
                <p className="auth-sub">
                    Kalau <b>{email.trim()}</b> terdaftar di Digora, kami sudah kirim link buat bikin password baru. Cek juga
                    folder spam kalau belum kelihatan dalam beberapa menit.
                </p>
                <p className="auth-alt">
                    <a href="/login">← Kembali ke login</a>
                </p>
            </>
        );
    }

    return (
        <>
            <h1 className="auth-title">Lupa password?</h1>
            <p className="auth-sub">Masukkan email akunmu, nanti kami kirim link buat bikin password baru.</p>

            <form className="auth-form" onSubmit={onSubmit} noValidate>
                {err && <div className="auth-alert">{err}</div>}

                <div className={`field ${err ? "err" : ""}`}>
                    <label htmlFor="fp-email">Email</label>
                    <div className="field-wrap">
                        <input
                            id="fp-email"
                            type="email"
                            placeholder="kamu@email.com"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <button className="auth-submit" type="submit" disabled={loading}>
                    {loading ? "Mengirim…" : "Kirim link reset"}
                </button>
            </form>

            <p className="auth-alt">
                Sudah ingat password? <a href="/login">Masuk</a>
            </p>
        </>
    );
}