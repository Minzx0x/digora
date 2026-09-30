"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import {
    searchSmmflareServicesAction,
    addSmmServiceAction,
    importAllSmmflareServicesAction,
    refreshSmmServiceRateAction,
    toggleSmmServiceActiveAction,
    updateSmmServiceMarginAction,
    type SmmAdminServiceRow,
} from "@/lib/actions/admin-smm";
import type { SmmflareService } from "@/lib/smmflare";
import { translateServiceName } from "@/lib/smm-translate";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");

// Halaman admin buat kurasi katalog SMM (smmflare bisa punya ribuan layanan —
// nggak pernah di-sync massal, admin cari & tambah satu-satu). Daftar pesanan
// SMM SENGAJA tidak diulang di sini — sudah otomatis kegabung di /admin/pesanan
// karena order SMM numpang di tabel orders yang sama dengan Telegram.
export default function AdminSmmCatalog({ services }: { services: SmmAdminServiceRow[] }) {
    const router = useRouter();
    const [q, setQ] = useState("");
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<SmmflareService[]>([]);
    const [searchErr, setSearchErr] = useState<string | null>(null);
    const [addingId, setAddingId] = useState<number | null>(null);
    const [bulkAdding, setBulkAdding] = useState(false);
    const [importingAll, setImportingAll] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);
    const [savingAll, setSavingAll] = useState(false);
    const [savedAll, setSavedAll] = useState(false);
    const [bulkMargin, setBulkMargin] = useState("");
    const [activatingAll, setActivatingAll] = useState(false);

    const [cost, setCost] = useState<Record<string, string>>(
        Object.fromEntries(services.map((s) => [s.id, String(s.costPricePer1000)])),
    );
    const [margin, setMargin] = useState<Record<string, string>>(
        Object.fromEntries(services.map((s) => [s.id, String(s.marginPercent)])),
    );

    // "services" datang dari server tiap kali page ini di-render ulang (mis.
    // setelah router.refresh()) — tanpa ini, kotak Modal/Markup tetap nampilin
    // angka lama yang nyangkut di state lokal walau angka di database sudah beda.
    useEffect(() => {
        setCost(Object.fromEntries(services.map((s) => [s.id, String(s.costPricePer1000)])));
        setMargin(Object.fromEntries(services.map((s) => [s.id, String(s.marginPercent)])));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [services]);

    async function doSearch(e: React.FormEvent) {
        e.preventDefault();
        setSearching(true);
        setSearchErr(null);
        const res = await searchSmmflareServicesAction(q);
        setSearching(false);
        if (res.error) {
            setSearchErr(res.error);
            setResults([]);
            return;
        }
        setResults(res.results);
    }

    async function addService(s: SmmflareService, active = false) {
        setAddingId(s.serviceId);
        const res = await addSmmServiceAction({
            providerServiceId: s.serviceId,
            category: s.category,
            name: s.name,
            rateUsd: s.rateUsd,
            minQuantity: s.min,
            maxQuantity: s.max,
            refill: s.refill,
            dripfeed: s.dripfeed,
            active,
        });
        setAddingId(null);
        if (res.error) {
            window.alert(res.error);
            return;
        }
        router.refresh();
    }

    // Tambah SEMUA hasil pencarian yang belum ada di katalog, langsung aktif —
    // buat kasus admin udah yakin semua hasil pencarian ini (mis. "tiktok
    // followers") mau langsung dijual, tanpa klik "+ Tambah" satu-satu.
    async function addAllResults() {
        const toAdd = results.filter((s) => !addedIds.has(s.serviceId));
        if (toAdd.length === 0) return;
        if (!window.confirm(`Tambah & aktifkan ${toAdd.length} layanan sekaligus?`)) return;
        setBulkAdding(true);
        for (const s of toAdd) {
            await addSmmServiceAction({
                providerServiceId: s.serviceId,
                category: s.category,
                name: s.name,
                rateUsd: s.rateUsd,
                minQuantity: s.min,
                maxQuantity: s.max,
                refill: s.refill,
                dripfeed: s.dripfeed,
                active: true,
            });
        }
        setBulkAdding(false);
        router.refresh();
    }

    // Tarik SEMUA layanan smmflare (bukan cuma hasil satu kata kunci), langsung
    // aktif — buat yang nggak mau cari-cari manual per platform satu-satu.
    // Yang sudah ada di katalog nggak disentuh (modal/markup custom aman).
    async function importAll() {
        if (
            !window.confirm(
                "Tarik SEMUA layanan dari smmflare sekaligus (bisa ribuan, langsung aktif)? Proses ini bisa makan waktu beberapa saat.",
            )
        )
            return;
        setImportingAll(true);
        const res = await importAllSmmflareServicesAction();
        setImportingAll(false);
        if (res.error) {
            window.alert(res.error);
            return;
        }
        window.alert(res.imported > 0 ? `${res.imported} layanan baru ditambah & diaktifkan.` : "Semua layanan sudah ada di katalog.");
        router.refresh();
    }

    // Simpan SEMUA baris yang modal/markup-nya diubah sekaligus — nggak perlu
    // klik "Simpan" satu-satu per layanan. Sama pola dengan savePrices() di
    // AdminPackages.tsx (halaman Paket & Harga).
    async function saveAllPrices() {
        setSavingAll(true);
        const changed = services.filter(
            (s) => Number(cost[s.id]) !== s.costPricePer1000 || Number(margin[s.id]) !== s.marginPercent,
        );
        for (const s of changed) {
            await updateSmmServiceMarginAction(s.id, Number(cost[s.id]) || 0, Number(margin[s.id]) || 0);
        }
        setSavingAll(false);
        setSavedAll(true);
        router.refresh();
        setTimeout(() => setSavedAll(false), 1800);
    }

    // Nyamain Markup % semua layanan sekaligus — ini baru ubah state di
    // browser, tetap harus pencet "Simpan semua" biar beneran kesimpen.
    function applyBulkMargin() {
        const n = Number(bulkMargin);
        if (!Number.isFinite(n) || n < 0) return;
        setMargin(Object.fromEntries(services.map((s) => [s.id, String(n)])));
    }

    async function refreshRate(id: string) {
        setBusyId(id);
        const res = await refreshSmmServiceRateAction(id);
        setBusyId(null);
        if (res.error) window.alert(res.error);
        router.refresh();
    }

    async function toggleActive(id: string, active: boolean) {
        setBusyId(id);
        await toggleSmmServiceActiveAction(id, active);
        setBusyId(null);
        router.refresh();
    }

    // Aktifkan SEMUA layanan yang masih nonaktif sekaligus (langsung tersimpan
    // ke DB, beda dari markup massal yang cuma state lokal) — buat kasus admin
    // udah yakin semua layanan yang sudah ditambah mau langsung dijual.
    async function activateAll() {
        const toActivate = services.filter((s) => !s.active);
        if (toActivate.length === 0) return;
        if (!window.confirm(`Aktifkan ${toActivate.length} layanan sekaligus?`)) return;
        setActivatingAll(true);
        for (const s of toActivate) {
            await toggleSmmServiceActiveAction(s.id, true);
        }
        setActivatingAll(false);
        router.refresh();
    }

    const addedIds = new Set(services.map((s) => s.providerServiceId));
    const inactiveCount = services.filter((s) => !s.active).length;

    return (
        <div className="dash">
            <AdminSidebar active="smm" />

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">SMM Panel</h1>
                        <p className="d-sub">Cari & kurasi layanan dari smmflare, atur markup, aktifkan yang mau dijual.</p>
                    </div>
                </header>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Cari &amp; tambah layanan</h2>
                        <button type="button" className="d-pill solid" disabled={importingAll} onClick={importAll}>
                            {importingAll ? "Menarik semua…" : "⇩ Tarik semua layanan smmflare"}
                        </button>
                    </div>
                    <p className="d-note">
                        Tombol di atas narik SEMUA layanan smmflare sekaligus (bisa ribuan, langsung aktif) — kalau mau lebih
                        terkontrol, cari per kata kunci di bawah dan tambah satu-satu / per hasil pencarian.
                    </p>
                    <form className="d-rsc-row" onSubmit={doSearch}>
                        <input
                            className="d-search"
                            type="search"
                            placeholder="Cari nama layanan atau ID (mis. Instagram Followers / 11034)"
                            aria-label="Cari layanan smmflare"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                        <button type="submit" className="d-pill solid" disabled={searching}>
                            {searching ? "Mencari…" : "Cari"}
                        </button>
                    </form>
                    <p className="d-note">
                        Hasil pencarian ditarik LANGSUNG dari smmflare (tidak disimpan ke database) — cuma layanan bertipe
                        &quot;Default&quot; (link + jumlah biasa) yang muncul. Klik &quot;+ Tambah&quot; buat masukin ke katalog
                        Digora (nonaktif dulu, atur markup lalu aktifkan di bawah).
                    </p>
                    {searchErr && <p className="d-note d-rsc-msg">{searchErr}</p>}
                    {results.length > 0 && (
                        <div className="d-table-wrap">
                            <div className="d-card-head">
                                <span className="mute">{results.length} hasil</span>
                                <button type="button" className="d-pill solid" disabled={bulkAdding} onClick={addAllResults}>
                                    {bulkAdding ? "Menambah semua…" : "+ Tambah & aktifkan semua"}
                                </button>
                            </div>
                            <table className="d-table">
                                <thead>
                                    <tr>
                                        <th>Layanan</th>
                                        <th>Kategori</th>
                                        <th>Rate/1000 (USD)</th>
                                        <th>Min–Max</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((s) => (
                                        <tr key={s.serviceId}>
                                            <td>{translateServiceName(s.name)}</td>
                                            <td className="mute">{translateServiceName(s.category)}</td>
                                            <td>${s.rateUsd.toFixed(3)}</td>
                                            <td className="mute">
                                                {num(s.min)}–{num(s.max)}
                                            </td>
                                            <td>
                                                {addedIds.has(s.serviceId) ? (
                                                    <span className="mute">Sudah ditambah</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="d-pill solid"
                                                        disabled={addingId === s.serviceId}
                                                        onClick={() => addService(s)}
                                                    >
                                                        {addingId === s.serviceId ? "Menambah…" : "+ Tambah"}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                <section className="d-card">
                    <div className="d-card-head">
                        <h2>Layanan di katalog ({services.length})</h2>
                        <div className="d-order-actions">
                            {inactiveCount > 0 && (
                                <button type="button" className="d-pill solid" disabled={activatingAll} onClick={activateAll}>
                                    {activatingAll ? "Mengaktifkan…" : `Aktifkan semua (${inactiveCount})`}
                                </button>
                            )}
                            <button className="d-btn" style={{ padding: "8px 18px" }} onClick={saveAllPrices} disabled={savingAll}>
                                {savingAll ? "Menyimpan…" : savedAll ? "Tersimpan ✓" : "Simpan semua"}
                            </button>
                        </div>
                    </div>

                    {services.length > 0 && (
                        <div className="d-rsc-box">
                            <div className="d-rsc-row">
                                <label className="d-rsc-rate">
                                    Markup massal (%)
                                    <input
                                        inputMode="numeric"
                                        aria-label="Markup massal untuk semua layanan"
                                        placeholder="mis. 40"
                                        value={bulkMargin}
                                        onChange={(e) => setBulkMargin(e.target.value.replace(/\D/g, ""))}
                                    />
                                </label>
                                <button type="button" className="d-pill solid" onClick={applyBulkMargin} disabled={!bulkMargin}>
                                    Terapkan ke semua layanan
                                </button>
                            </div>
                            <p className="d-note">
                                Nyamain Markup % semua layanan jadi satu angka sekaligus. Jangan lupa pencet{" "}
                                <b>Simpan semua</b> di atas setelah ini biar beneran tersimpan.
                            </p>
                        </div>
                    )}

                    {services.length === 0 && <p className="d-note">Belum ada layanan ditambah. Cari &amp; tambah di atas dulu.</p>}
                    {services.map((s) => (
                        <div className="d-pack" key={s.id}>
                            <div className="d-pack-info">
                                <div className="d-pack-name">
                                    {translateServiceName(s.name)} {!s.active && <span className="d-pack-note">(nonaktif)</span>}
                                </div>
                                <div className="d-pack-note">
                                    {translateServiceName(s.category)} · {num(s.minQuantity)}–{num(s.maxQuantity)}
                                </div>
                            </div>
                            <div className="d-pack-fields">
                                <label>
                                    Modal/1000
                                    <input
                                        inputMode="numeric"
                                        aria-label={`Modal ${s.name}`}
                                        value={cost[s.id] ?? ""}
                                        onChange={(e) => setCost({ ...cost, [s.id]: e.target.value.replace(/\D/g, "") })}
                                    />
                                </label>
                                <label>
                                    Markup %
                                    <input
                                        inputMode="numeric"
                                        aria-label={`Markup ${s.name}`}
                                        value={margin[s.id] ?? ""}
                                        onChange={(e) => setMargin({ ...margin, [s.id]: e.target.value.replace(/\D/g, "") })}
                                    />
                                </label>
                                <div className="d-pack-sell">
                                    <span>Jual/1000</span>
                                    <b>{rp(Math.round((Number(cost[s.id]) || 0) * (1 + (Number(margin[s.id]) || 0) / 100)))}</b>
                                </div>
                            </div>
                            <div className="d-order-actions">
                                <button type="button" className="d-pill solid" disabled={busyId === s.id} onClick={() => refreshRate(s.id)}>
                                    ⟳ Refresh harga
                                </button>
                                <button
                                    type="button"
                                    className="d-pill solid"
                                    disabled={busyId === s.id}
                                    onClick={() => toggleActive(s.id, !s.active)}
                                >
                                    {s.active ? "Nonaktifkan" : "Aktifkan"}
                                </button>
                            </div>
                        </div>
                    ))}
                </section>
            </main>
        </div>
    );
}
