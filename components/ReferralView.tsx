"use client";

import { useEffect, useState } from "react";
import Toast from "./Toast";
import type { ReferralStats } from "@/lib/actions/referral";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");

async function copy(text: string, onDone: (ok: boolean) => void) {
    try {
        await navigator.clipboard.writeText(text);
        onDone(true);
    } catch {
        onDone(false);
    }
}

// Ikon bulat bergaya sama kayak .s-mut-ico di riwayat saldo (SaldoView) --
// dipakai lagi di sini biar kerasa satu bahasa visual sama bagian dashboard
// lain, bukan ikon baru yang beda gaya.
function StatIcon({ d }: { d: string }) {
    return (
        <span className="s-mut-ico in" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d={d} />
            </svg>
        </span>
    );
}

const I = {
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
    coins: "M12 8c3.3 0 6-1.1 6-2.5S15.3 3 12 3 6 4.1 6 5.5 8.7 8 12 8M6 5.5V9c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V5.5M6 9v3.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V9M6 12.5V16c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-3.5",
};

export default function ReferralView({ initial }: { initial: ReferralStats }) {
    const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
    const [link, setLink] = useState("");

    // Di-set abis mount (bukan langsung pas render) biar nggak mismatch sama
    // HTML dari server, yang nggak tahu origin domainnya.
    useEffect(() => {
        if (initial.code) setLink(`${window.location.origin}/daftar?ref=${initial.code}`);
    }, [initial.code]);

    if (!initial.code) {
        return (
            <section className="d-card">
                <p className="d-note">Tidak bisa memuat data referral. Coba refresh halaman.</p>
            </section>
        );
    }

    return (
        <>
            {toast && <Toast message={toast.message} kind={toast.kind} onDone={() => setToast(null)} />}

            <section className="d-card">
                <div className="d-card-head">
                    <h2>Kode referral kamu</h2>
                </div>

                {/* Kode referral ini elemen paling penting di halaman ini --
                    dibikin jadi fokus visual utama (kayak kode kupon), bukan
                    nyempil jadi input field biasa kayak form pengaturan. */}
                <div
                    style={{
                        padding: "26px 20px",
                        borderRadius: 20,
                        background: "linear-gradient(135deg, #2540ff, #0f1f9e)",
                        textAlign: "center",
                    }}
                >
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.75)" }}>
                        Kode referral kamu
                    </div>
                    <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: 6, color: "#ffffff", margin: "10px 0 20px" }}>
                        {initial.code}
                    </div>
                    <button
                        type="button"
                        onClick={() => copy(initial.code, (ok) => setToast({ message: ok ? "Kode disalin!" : "Gagal menyalin.", kind: ok ? "success" : "error" }))}
                        style={{
                            border: 0,
                            borderRadius: 999,
                            padding: "10px 26px",
                            background: "#ffffff",
                            color: "#2540ff",
                            fontWeight: 700,
                            fontSize: 14,
                            cursor: "pointer",
                        }}
                    >
                        Salin kode
                    </button>
                </div>

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginTop: 12,
                        padding: "10px 14px",
                        borderRadius: 14,
                        background: "var(--d-surface-2)",
                    }}
                >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--d-text-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {link || "Menyiapkan link…"}
                    </span>
                    <button
                        type="button"
                        className="d-btn"
                        style={{ padding: "6px 16px", fontSize: 13, whiteSpace: "nowrap", flexShrink: 0 }}
                        onClick={() => copy(link, (ok) => setToast({ message: ok ? "Link disalin!" : "Gagal menyalin.", kind: ok ? "success" : "error" }))}
                    >
                        Salin link
                    </button>
                </div>

                <div
                    style={{
                        marginTop: 16,
                        padding: "14px 16px",
                        borderRadius: 16,
                        background: "var(--d-badge-ok-bg)",
                        color: "var(--d-badge-ok-text)",
                        fontSize: 13.5,
                        lineHeight: 1.6,
                    }}
                >
                    Begitu temanmu daftar pakai kode ini dan top up saldo untuk pertama kali, kamu dapat komisi{" "}
                    <b>{initial.bonusPercent}%</b> dari nominal top up pertamanya (maksimal <b>{rp(initial.bonusCap)}</b>) —
                    otomatis masuk saldo, tidak perlu klaim manual. Temanmu sendiri tidak dapat bonus tambahan.
                </div>

                <div className="d-stats d-stats-2col" style={{ marginTop: 16 }}>
                    <div className="d-stat d-stat-row">
                        <StatIcon d={I.users} />
                        <div>
                            <span>Teman diajak</span>
                            <strong>{num(initial.referredCount)}</strong>
                        </div>
                    </div>
                    <div className="d-stat d-stat-row">
                        <StatIcon d={I.coins} />
                        <div>
                            <span>Total komisi didapat</span>
                            <strong>{rp(initial.totalEarned)}</strong>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
