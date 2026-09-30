"use client";

import { useEffect, useState } from "react";
import Brand from "./Brand";
import AuthForm from "./AuthForm";
import { FaStar, FaPaperPlane, FaBolt, FaGift } from "react-icons/fa6";
import IconBadge from "./IconBadge";
import "./auth.css";

type Mode = "login" | "register";

const PATH: Record<Mode, string> = { login: "/login", register: "/daftar" };
const TITLE: Record<Mode, string> = { login: "Masuk — Digora", register: "Daftar — Digora" };

const COPY: Record<Mode, { title: React.ReactNode; text: string }> = {
    login: {
        title: (
            <>
                Satu akun,
                <br />
                semua produk.
            </>
        ),
        text: "Masuk untuk memantau pesanan Stars, Premium, dan SMM Panel kapan saja, 24/7.",
    },
    register: {
        title: (
            <>
                Mulai belanja
                <br />
                tanpa ribet.
            </>
        ),
        text: "Buat akun gratis, lalu pesan Stars, Premium, atau SMM Panel dalam hitungan detik.",
    },
};

export default function AuthShell({ initial }: { initial: Mode }) {
    const [mode, setMode] = useState<Mode>(initial);

    // tombol back/forward browser ikut menggeser panel
    useEffect(() => {
        const onPop = () => {
            const m: Mode = window.location.pathname.startsWith("/daftar") ? "register" : "login";
            setMode(m);
            document.title = TITLE[m];
        };
        window.addEventListener("popstate", onPop);
        return () => window.removeEventListener("popstate", onPop);
    }, []);

    function go(next: Mode) {
        if (next === mode) return;
        setMode(next);
        window.history.pushState(null, "", PATH[next]);
        document.title = TITLE[next];
    }

    const pane = (m: Mode) => {
        const on = mode === m;
        return (
            <section
                className={`auth-form-side pane-${m} ${on ? "on" : ""}`}
                aria-hidden={!on}
                inert={!on}
            >
                <div className="auth-top">
                    <a className="auth-back" href="/">
                        ← Kembali ke beranda
                    </a>
                </div>
                <div className="auth-center">
                    <div className="auth-box">
                        <AuthForm mode={m} onSwitch={() => go(m === "login" ? "register" : "login")} />
                    </div>
                </div>
            </section>
        );
    };

    return (
        <main className="auth-page">
            <div className="auth" data-mode={mode}>
                {pane("login")}
                {pane("register")}

                <aside className="auth-art">
                    <Brand light />
                    <div className="auth-art-scene" aria-hidden="true">
                        <IconBadge icon={FaStar} bg="#ffffff" color="#f5a623" size={88} className="float" style={{ right: 60, top: 90 }} />
                        <IconBadge icon={FaPaperPlane} bg="#ffffff" color="#2540ff" size={64} className="float-slow" style={{ left: 40, top: 250 }} />
                        <IconBadge icon={FaBolt} bg="#ffffff" color="#2540ff" size={56} className="float-slow" style={{ right: 230, top: 330 }} />
                        <IconBadge icon={FaGift} bg="#ffffff" color="#e4483c" size={48} className="float" style={{ right: 20, top: 400 }} />
                    </div>
                    <div className="auth-art-copy">
                        {(["login", "register"] as Mode[]).map((m) => (
                            <div key={m} className={`auth-copy-item ${mode === m ? "on" : ""}`} aria-hidden={mode !== m}>
                                <h2>{COPY[m].title}</h2>
                                <p>{COPY[m].text}</p>
                            </div>
                        ))}
                    </div>
                </aside>
            </div>
        </main>
    );
}