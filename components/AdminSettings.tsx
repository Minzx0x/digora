"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import { updateUsdIdrRateAction, addStockAction, type SettingsData } from "@/lib/actions/admin";
import { changePasswordAction } from "@/lib/actions/data";

export default function AdminSettings({ data }: { data: SettingsData }) {
    const router = useRouter();
    const [rate, setRate] = useState(String(data.usdIdrRate));
    const [rateSaving, setRateSaving] = useState(false);
    const [rateSaved, setRateSaved] = useState(false);
    const [rateError, setRateError] = useState<string | null>(null);

    const [stock, setStock] = useState(String(data.stock));
    const [stockSaving, setStockSaving] = useState(false);
    const [stockSaved, setStockSaved] = useState(false);
    const [stockError, setStockError] = useState<string | null>(null);

    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
    const [pwBusy, setPwBusy] = useState(false);

    // "data" datang dari server tiap kali halaman ini di-render ulang (misalnya
    // setelah router.refresh() di bawah). Tanpa ini, kotak kurs/stok bisa nampilin
    // angka lama yang nyangkut di state lokal walau nilai barunya sudah tersimpan.
    useEffect(() => {
        setRate(String(data.usdIdrRate));
        setStock(String(data.stock));
    }, [data.usdIdrRate, data.stock]);

    async function saveRate() {
        const n = Number(rate);
        if (!Number.isFinite(n) || n <= 0) {
            setRateError("Kurs tidak valid.");
            return;
        }
        setRateError(null);
        setRateSaving(true);
        const res = await updateUsdIdrRateAction(n);
        setRateSaving(false);
        if (res.error) {
            setRateError(res.error);
            return;
        }
        setRateSaved(true);
        router.refresh();
        setTimeout(() => setRateSaved(false), 1800);
    }

    async function saveStock() {
        const target = Number(stock);
        if (!Number.isFinite(target) || target < 0) {
            setStockError("Jumlah tidak valid.");
            return;
        }
        setStockError(null);
        const delta = target - data.stock;
        if (delta === 0) {
            setStockSaved(true);
            setTimeout(() => setStockSaved(false), 1800);
            return;
        }
        setStockSaving(true);
        const res = await addStockAction(delta);
        setStockSaving(false);
        if (res.error) {
            setStockError(res.error);
            return;
        }
        setStockSaved(true);
        router.refresh();
        setTimeout(() => setStockSaved(false), 1800);
    }

    async function savePw(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setPwMsg(null);
        const form = new FormData(e.currentTarget);
        const oldPassword = String(form.get("old") ?? "");
        const newPassword = String(form.get("new") ?? "");
        const again = String(form.get("again") ?? "");
        if (newPassword.length < 6) {
            setPwMsg({ ok: false, text: "Password baru minimal 6 karakter." });
            return;
        }
        if (newPassword !== again) {
            setPwMsg({ ok: false, text: "Konfirmasi password tidak sama." });
            return;
        }
        setPwBusy(true);
        const res = await changePasswordAction({ oldPassword, newPassword });
        setPwBusy(false);
        if (res.error) {
            setPwMsg({ ok: false, text: res.error });
        } else {
            setPwMsg({ ok: true, text: "Password berhasil diganti." });
            e.currentTarget.reset();
        }
    }

    return (
        <div className="dash">
            <AdminSidebar active="pengaturan" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Pengaturan</h1>
                        <p className="d-sub">Kurs, stok, koneksi supplier, dan keamanan akun admin.</p>
                    </div>
                </header>

                <section className="d-grid-mid">
                    <div className="d-card">
                        <div className="d-card-head">
                            <h2>Toko</h2>
                        </div>
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveRate();
                            }}
                            style={{ display: "flex", flexDirection: "column", gap: 14 }}
                        >
                            <label className="d-rsc-rate">
                                Kurs USD → IDR
                                <input inputMode="numeric" value={rate} onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))} />
                            </label>
                            <button type="submit" className="d-btn" style={{ alignSelf: "flex-start", padding: "8px 18px" }} disabled={rateSaving}>
                                {rateSaving ? "Menyimpan…" : rateSaved ? "Tersimpan ✓" : "Simpan kurs"}
                            </button>
                            {rateError && (
                                <p className="d-note" style={{ color: "#dc2626" }}>
                                    {rateError}
                                </p>
                            )}
                        </form>

                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                saveStock();
                            }}
                            style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 22 }}
                        >
                            <label className="d-rsc-rate">
                                Stok Stars tersedia
                                <input inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value.replace(/\D/g, ""))} />
                            </label>
                            <button type="submit" className="d-btn" style={{ alignSelf: "flex-start", padding: "8px 18px" }} disabled={stockSaving}>
                                {stockSaving ? "Menyimpan…" : stockSaved ? "Tersimpan ✓" : "Simpan stok"}
                            </button>
                            {stockError && (
                                <p className="d-note" style={{ color: "#dc2626" }}>
                                    {stockError}
                                </p>
                            )}
                        </form>
                    </div>

                    <div className="d-card">
                        <div className="d-card-head">
                            <h2>Supplier RSC (resell.codes)</h2>
                        </div>
                        <p className="d-note" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                                aria-hidden="true"
                                style={{
                                    width: 10,
                                    height: 10,
                                    borderRadius: "50%",
                                    display: "inline-block",
                                    background: data.rscConfigured ? "#16a34a" : "#dc2626",
                                }}
                            />
                            {data.rscConfigured ? "API key terpasang di server." : "API key belum diisi di .env.local server."}
                        </p>
                        <p className="d-note">
                            Dipakai untuk tarik harga modal Telegram Stars &amp; Premium (di halaman Paket &amp; Harga) dan meneruskan
                            pesanan Stars/Premium supaya benar-benar terkirim. Kalau belum terpasang, isi{" "}
                            <code>RSC_API_KEY</code> di <code>.env.local</code> lalu restart server — key-nya sendiri tidak pernah
                            ditampilkan di sini.
                        </p>
                    </div>
                </section>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Keamanan akun admin</h2>
                    </div>
                    <p className="d-note" style={{ marginBottom: 12 }}>
                        Masuk sebagai <b>{data.adminEmail}</b>
                    </p>
                    <form className="u-mini" onSubmit={savePw}>
                        <label>
                            Password lama
                            <div className="u-mini-pw">
                                <input name="old" type={showOldPw ? "text" : "password"} autoComplete="current-password" required />
                                <button type="button" className="eye" onClick={() => setShowOldPw((s) => !s)}>
                                    {showOldPw ? "Tutup" : "Lihat"}
                                </button>
                            </div>
                        </label>
                        <label>
                            Password baru
                            <div className="u-mini-pw">
                                <input name="new" type={showNewPw ? "text" : "password"} autoComplete="new-password" required minLength={6} />
                                <button type="button" className="eye" onClick={() => setShowNewPw((s) => !s)}>
                                    {showNewPw ? "Tutup" : "Lihat"}
                                </button>
                            </div>
                        </label>
                        <label>
                            Ulangi password baru
                            <div className="u-mini-pw">
                                <input name="again" type={showNewPw ? "text" : "password"} autoComplete="new-password" required minLength={6} />
                            </div>
                        </label>
                        {pwMsg && (
                            <p className="d-note" style={{ color: pwMsg.ok ? "#16a34a" : "#dc2626" }}>
                                {pwMsg.text}
                            </p>
                        )}
                        <button type="submit" className="d-btn" style={{ alignSelf: "flex-start", padding: "8px 18px" }} disabled={pwBusy}>
                            {pwBusy ? "Menyimpan…" : "Ganti password"}
                        </button>
                    </form>
                </section>
            </main>
        </div>
    );
}