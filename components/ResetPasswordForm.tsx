"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePasswordAction } from "@/lib/actions/auth";

export default function ResetPasswordForm() {
    const router = useRouter();
    const [pw, setPw] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [err, setErr] = useState("");
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (pw.length < 8) {
            setErr("Password minimal 8 karakter.");
            return;
        }
        if (pw !== confirm) {
            setErr("Konfirmasi password tidak sama.");
            return;
        }
        setErr("");
        setLoading(true);
        try {
            const { error } = await updatePasswordAction(pw);
            if (error) {
                setErr(error);
                return;
            }
            setDone(true);
            setTimeout(() => {
                router.push("/dashboard");
                router.refresh();
            }, 1200);
        } catch {
            setErr("Tidak bisa terhubung ke server. Coba lagi.");
        } finally {
            setLoading(false);
        }
    }

    if (done) {
        return (
            <>
                <h1 className="auth-title">Password berhasil diubah</h1>
                <p className="auth-sub">Mengalihkan ke dashboard kamu…</p>
            </>
        );
    }

    return (
        <>
            <h1 className="auth-title">Buat password baru</h1>
            <p className="auth-sub">Masukkan password baru buat akunmu.</p>

            <form className="auth-form" onSubmit={onSubmit} noValidate>
                {err && <div className="auth-alert">{err}</div>}

                <div className={`field ${err ? "err" : ""}`}>
                    <label htmlFor="rp-pw">Password baru</label>
                    <div className="field-wrap">
                        <input
                            id="rp-pw"
                            type={showPw ? "text" : "password"}
                            placeholder="Minimal 8 karakter"
                            autoComplete="new-password"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            style={{ paddingRight: 72 }}
                        />
                        <button type="button" className="eye" onClick={() => setShowPw((s) => !s)}>
                            {showPw ? "Tutup" : "Lihat"}
                        </button>
                    </div>
                </div>

                <div className={`field ${err ? "err" : ""}`}>
                    <label htmlFor="rp-confirm">Ulangi password baru</label>
                    <div className="field-wrap">
                        <input
                            id="rp-confirm"
                            type={showPw ? "text" : "password"}
                            placeholder="Ketik ulang password baru"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    </div>
                </div>

                <button className="auth-submit" type="submit" disabled={loading}>
                    {loading ? "Menyimpan…" : "Simpan password baru"}
                </button>
            </form>
        </>
    );
}