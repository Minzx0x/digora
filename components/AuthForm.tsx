"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction, signUpAction } from "@/lib/actions/auth";

type Mode = "login" | "register";
type Errors = Partial<Record<"name" | "username" | "email" | "password" | "confirm" | "terms", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function strength(pw: string) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
    return pw ? Math.max(1, s) : 0;
}

export default function AuthForm({ mode, onSwitch }: { mode: Mode; onSwitch?: () => void }) {
    const swap = (e: React.MouseEvent) => {
        if (!onSwitch) return; // tanpa handler: pakai navigasi biasa
        e.preventDefault();
        onSwitch();
    };
    const router = useRouter();
    const reg = mode === "register";
    const [showPw, setShowPw] = useState(false);
    const [pw, setPw] = useState("");
    const [errors, setErrors] = useState<Errors>({});
    const [alert, setAlert] = useState<{ ok: boolean; text: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const v = (k: string) => String(f.get(k) ?? "").trim();
        const next: Errors = {};

        if (reg) {
            if (v("name").length < 2) next.name = "Nama minimal 2 karakter.";
            // Opsional — cuma divalidasi formatnya kalau memang diisi (customer yang
            // cuma mau SMM Panel nggak butuh username Telegram).
            if (v("username") && !/^[a-zA-Z0-9_]{5,32}$/.test(v("username")))
                next.username = "Username Telegram 5–32 karakter (huruf, angka, _).";
        }
        if (!EMAIL_RE.test(v("email"))) next.email = "Format email belum benar.";
        if (String(f.get("password") ?? "").length < 8) next.password = "Password minimal 8 karakter.";
        if (reg) {
            if (f.get("password") !== f.get("confirm")) next.confirm = "Konfirmasi password tidak sama.";
            if (!f.get("terms")) next.terms = "Setujui syarat & ketentuan dulu.";
        }

        setErrors(next);
        setAlert(null);
        if (Object.keys(next).length) return;

        const email = v("email");
        const password = String(f.get("password") ?? "");

        setLoading(true);
        try {
            if (reg) {
                const { error, needsConfirm } = await signUpAction({
                    email,
                    password,
                    name: v("name"),
                    username: v("username"),
                });
                if (error) {
                    setAlert({ ok: false, text: error });
                    return;
                }
                if (needsConfirm) {
                    setAlert({ ok: true, text: "Akun dibuat. Cek email kamu untuk konfirmasi sebelum masuk." });
                    return;
                }
                router.push("/dashboard");
                router.refresh();
                return;
            }

            const { error } = await signInAction(email, password);
            if (error) {
                setAlert({ ok: false, text: error });
                return;
            }
            // Selalu ke Beranda dulu abis login, BUKAN ke "next" (halaman yang
            // tadinya mau dibuka pas belum login) — biar konsisten sama alur
            // daftar akun baru (yang juga selalu ke Beranda), bukan nyasar ke
            // menu lain.
            router.push("/dashboard");
            router.refresh();
        } catch {
            setAlert({ ok: false, text: "Tidak bisa terhubung ke server. Coba lagi." });
        } finally {
            setLoading(false);
        }
    }

    const level = strength(pw);

    const field = (
        id: keyof Errors,
        label: string,
        props: React.InputHTMLAttributes<HTMLInputElement>,
        cls = "",
    ) => (
        <div className={`field ${errors[id] ? "err" : ""}`}>
            <label htmlFor={`${mode}-${id}`}>{label}</label>
            <div className={`field-wrap ${cls}`}>
                <input id={`${mode}-${id}`} name={id} aria-invalid={!!errors[id]} {...props} />
            </div>
            {errors[id] && <span className="field-err">{errors[id]}</span>}
        </div>
    );

    return (
        <>
            <h1 className="auth-title">{reg ? "Buat akun" : "Selamat datang"}</h1>
            <p className="auth-sub">
                {reg
                    ? "Daftar gratis dan mulai belanja dalam hitungan detik."
                    : "Masuk untuk melihat pesanan dan belanja lagi."}
            </p>

            <form className="auth-form" onSubmit={onSubmit} noValidate>
                {alert && <div className={`auth-alert ${alert.ok ? "ok" : ""}`}>{alert.text}</div>}

                {reg && field("name", "Nama lengkap", { type: "text", placeholder: "Nama kamu", autoComplete: "name" })}
                {reg &&
                    field(
                        "username",
                        "Username Telegram (opsional)",
                        { type: "text", placeholder: "username", autoComplete: "username" },
                        "field-prefix",
                    )}
                {field("email", "Email", {
                    type: "email",
                    placeholder: "kamu@email.com",
                    autoComplete: "email",
                })}

                <div className={`field ${errors.password ? "err" : ""}`}>
                    <label htmlFor={`${mode}-password`}>Password</label>
                    <div className="field-wrap">
                        <input
                            id={`${mode}-password`}
                            name="password"
                            type={showPw ? "text" : "password"}
                            placeholder={reg ? "Minimal 8 karakter" : "Password kamu"}
                            autoComplete={reg ? "new-password" : "current-password"}
                            aria-invalid={!!errors.password}
                            onChange={(e) => setPw(e.target.value)}
                            style={{ paddingRight: 72 }}
                        />
                        <button type="button" className="eye" onClick={() => setShowPw((s) => !s)}>
                            {showPw ? "Tutup" : "Lihat"}
                        </button>
                    </div>
                    {reg && (
                        <div className="pw-meter" aria-hidden="true">
                            {[1, 2, 3].map((n) => (
                                <i key={n} className={level >= n ? `on${level}` : ""} />
                            ))}
                        </div>
                    )}
                    {errors.password && <span className="field-err">{errors.password}</span>}
                </div>

                {reg &&
                    field("confirm", "Ulangi password", {
                        type: showPw ? "text" : "password",
                        placeholder: "Ketik ulang password",
                        autoComplete: "new-password",
                    })}

                {reg ? (
                    <div className="field">
                        <label className="auth-check" style={{ fontWeight: 500 }}>
                            <input type="checkbox" name="terms" />
                            <span className="auth-terms">
                                Saya setuju dengan{" "}
                                <a className="auth-link" href="/syarat-ketentuan" target="_blank" rel="noopener noreferrer">
                                    Syarat &amp; Ketentuan
                                </a>{" "}
                                dan{" "}
                                <a className="auth-link" href="/kebijakan-privasi" target="_blank" rel="noopener noreferrer">
                                    Kebijakan Privasi
                                </a>{" "}
                                Digora.
                            </span>
                        </label>
                        {errors.terms && <span className="field-err">{errors.terms}</span>}
                    </div>
                ) : (
                    <div className="auth-row">
                        <label className="auth-check">
                            <input type="checkbox" name="remember" />
                            Ingat saya
                        </label>
                        <a className="auth-link" href="/lupa-password">
                            Lupa password?
                        </a>
                    </div>
                )}

                <button className="auth-submit" type="submit" disabled={loading}>
                    {loading ? "Memproses…" : reg ? "Daftar sekarang" : "Masuk"}
                </button>
            </form>

            <p className="auth-alt">
                {reg ? (
                    <>
                        Sudah punya akun? <a href="/login" onClick={swap}>Masuk</a>
                    </>
                ) : (
                    <>
                        Belum punya akun? <a href="/daftar" onClick={swap}>Daftar</a>
                    </>
                )}
            </p>
        </>
    );
}