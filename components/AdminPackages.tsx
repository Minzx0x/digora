"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import { updatePackageCostAction, updateUsdIdrRateAction, type PaketData } from "@/lib/actions/admin";
import { syncTelegramCostFromRSC } from "@/lib/actions/rsc-sync";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

// Halaman admin terpisah untuk kelola Paket & Harga — sebelumnya nempel di
// Ringkasan (id="paket" di dalam DashboardView), sekarang jadi route sendiri
// /admin/paket biar konsisten sama Pesanan/Pelanggan/Pembayaran/Pengaturan
// (klik di sidebar beneran pindah halaman, bukan cuma anchor-scroll).
export default function AdminPackages({ data }: { data: PaketData }) {
    const router = useRouter();
    const catalog = data.catalog ?? [];
    const [cost, setCost] = useState<Record<string, string>>(
        Object.fromEntries(catalog.map((p) => [p.id, String(p.costPrice)])),
    );
    const [margin, setMargin] = useState<Record<string, string>>(
        Object.fromEntries(catalog.map((p) => [p.id, String(p.marginPercent)])),
    );
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [rate, setRate] = useState(String(data.usdIdrRate));
    const [rscBusy, setRscBusy] = useState(false);
    const [rscMsg, setRscMsg] = useState<string | null>(null);
    const [bulkMargin, setBulkMargin] = useState("");

    useEffect(() => {
        setRate(String(data.usdIdrRate));
    }, [data.usdIdrRate]);

    // "catalog" datang dari server tiap kali page ini di-render ulang (mis.
    // setelah router.refresh()). Tanpa ini, kotak Modal/Markup tetap nampilin
    // angka lama yang nyangkut di state lokal walau angka di database sudah beda.
    useEffect(() => {
        setCost(Object.fromEntries(catalog.map((p) => [p.id, String(p.costPrice)])));
        setMargin(Object.fromEntries(catalog.map((p) => [p.id, String(p.marginPercent)])));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [catalog]);

    async function savePrices() {
        setSaving(true);
        const changed = catalog.filter(
            (p) => Number(cost[p.id]) !== p.costPrice || Number(margin[p.id]) !== p.marginPercent,
        );
        for (const p of changed) {
            await updatePackageCostAction(p.id, Number(cost[p.id]), Number(margin[p.id]));
        }
        setSaving(false);
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 1800);
    }

    async function syncFromRsc() {
        setRscBusy(true);
        setRscMsg(null);
        // Kalau kurs di kotak sudah diubah tapi belum disimpan, simpan dulu supaya
        // sinkron langsung pakai kurs terbaru.
        const rateNum = Number(rate);
        if (Number.isFinite(rateNum) && rateNum > 0 && rateNum !== data.usdIdrRate) {
            await updateUsdIdrRateAction(rateNum);
        }
        const result = await syncTelegramCostFromRSC();
        setRscBusy(false);
        if (result.error) {
            setRscMsg(result.error);
            return;
        }
        let msg = `Berhasil update modal ${result.updated} paket dari RSC.`;
        if (result.skipped.length > 0) msg += ` Dilewati (tidak ada harga cocok): ${result.skipped.join(", ")}.`;
        setRscMsg(msg);
        router.refresh();
    }

    async function saveRate() {
        const rateNum = Number(rate);
        if (!Number.isFinite(rateNum) || rateNum <= 0) return;
        await updateUsdIdrRateAction(rateNum);
        router.refresh();
    }

    // Nyamain Markup % semua paket sekaligus (mis. mau 40% rata buat semua),
    // biar gak perlu ketik satu-satu di tiap baris. Ini baru ubah state di
    // browser — tetap harus pencet "Simpan" di atas biar beneran kesimpen.
    function applyBulkMargin() {
        const n = Number(bulkMargin);
        if (!Number.isFinite(n) || n < 0) return;
        setMargin(Object.fromEntries(catalog.map((p) => [p.id, String(n)])));
    }

    return (
        <div className="dash">
            <AdminSidebar active="paket" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">Paket &amp; Harga</h1>
                        <p className="d-sub">Atur modal, markup, dan harga jual paket Stars &amp; Premium.</p>
                    </div>
                </header>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Paket &amp; harga</h2>
                        <button className="d-btn" style={{ padding: "8px 18px" }} onClick={savePrices} disabled={saving}>
                            {saving ? "Menyimpan…" : saved ? "Tersimpan ✓" : "Simpan"}
                        </button>
                    </div>

                    <div className="d-rsc-box">
                        <div className="d-rsc-row">
                            <label className="d-rsc-rate">
                                Kurs USD → IDR
                                <input
                                    inputMode="numeric"
                                    aria-label="Kurs USD ke IDR"
                                    value={rate}
                                    onChange={(e) => setRate(e.target.value.replace(/\D/g, ""))}
                                    onBlur={saveRate}
                                />
                            </label>
                            <button type="button" className="d-pill solid" onClick={syncFromRsc} disabled={rscBusy}>
                                {rscBusy ? "Menyinkronkan…" : "⟳ Sync modal dari RSC"}
                            </button>
                        </div>
                        <p className="d-note">
                            Menarik harga modal Telegram Stars &amp; Premium langsung dari akun RSC (resell.codes) kamu — cuma
                            kategori Telegram, kategori lain (gift card, top-up game, dst) tidak disentuh. Markup tetap sesuai
                            yang kamu atur di bawah.
                        </p>
                        {rscMsg && <p className="d-note d-rsc-msg">{rscMsg}</p>}
                    </div>

                    <div className="d-rsc-box">
                        <div className="d-rsc-row">
                            <label className="d-rsc-rate">
                                Markup massal (%)
                                <input
                                    inputMode="numeric"
                                    aria-label="Markup massal untuk semua paket"
                                    placeholder="mis. 40"
                                    value={bulkMargin}
                                    onChange={(e) => setBulkMargin(e.target.value.replace(/\D/g, ""))}
                                />
                            </label>
                            <button type="button" className="d-pill solid" onClick={applyBulkMargin} disabled={!bulkMargin}>
                                Terapkan ke semua paket
                            </button>
                        </div>
                        <p className="d-note">
                            Nyamain Markup % semua paket (Stars &amp; Premium) jadi satu angka sekaligus, biar gak perlu ketik satu-
                            satu. Jangan lupa pencet <b>Simpan</b> di atas setelah ini biar beneran tersimpan.
                        </p>
                    </div>

                    {(["stars", "premium"] as const).map((kind) => (
                        <div key={kind}>
                            <div className="d-pack-group">{kind === "stars" ? "Telegram Stars" : "Telegram Premium"}</div>
                            {catalog
                                .filter((p) => p.kind === kind)
                                .map((p) => (
                                    <div className="d-pack" key={p.id}>
                                        <span
                                            className="d-pack-ico"
                                            style={{ background: kind === "stars" ? "#fff4cc" : "#e4e9ff" }}
                                            aria-hidden="true"
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24">
                                                <path
                                                    d="M12 2l3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z"
                                                    fill={kind === "stars" ? "#f5b400" : "#2540ff"}
                                                />
                                            </svg>
                                        </span>
                                        <div className="d-pack-info">
                                            <div className="d-pack-name">{p.label}</div>
                                            <div className="d-pack-note">{p.note}</div>
                                        </div>
                                        <div className="d-pack-fields">
                                            <label>
                                                Modal
                                                <input
                                                    inputMode="numeric"
                                                    aria-label={`Modal ${p.label}`}
                                                    value={cost[p.id] ?? ""}
                                                    onChange={(e) => setCost({ ...cost, [p.id]: e.target.value.replace(/\D/g, "") })}
                                                />
                                            </label>
                                            <label>
                                                Markup %
                                                <input
                                                    inputMode="numeric"
                                                    aria-label={`Markup ${p.label}`}
                                                    value={margin[p.id] ?? ""}
                                                    onChange={(e) => setMargin({ ...margin, [p.id]: e.target.value.replace(/\D/g, "") })}
                                                />
                                            </label>
                                            <div className="d-pack-sell">
                                                <span>Jual</span>
                                                <b>{rp(Math.round((Number(cost[p.id]) || 0) * (1 + (Number(margin[p.id]) || 0) / 100)))}</b>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    ))}
                    <p className="d-note" style={{ marginTop: 10 }}>
                        Harga jual dihitung otomatis dari Modal × Markup. Nanti kalau modal ditarik dari API supplier, tinggal
                        ganti kolom Modal saja — harga jual ke pembeli ikut menyesuaikan sendiri.
                    </p>
                    {catalog.length === 0 && <p className="d-note">Katalog belum ada. Jalankan supabase/schema.sql dulu.</p>}
                </section>
            </main>
        </div>
    );
}