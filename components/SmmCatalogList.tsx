"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { IconType } from "react-icons";
import { FaInstagram, FaYoutube, FaTiktok, FaXTwitter, FaSpotify, FaTelegram, FaFacebook, FaTwitch, FaRedditAlien, FaGlobe, FaLink } from "react-icons/fa6";
import { getSmmServicesEtaAction, type SmmServiceRow, type SmmServiceEta } from "@/lib/actions/smm";
import { translateServiceName } from "@/lib/smm-translate";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");

// Deteksi platform sama persis pola di SmmView.tsx (dropdown pemesanan) —
// duplikat kecil yang disengaja: di sana platform ikut alur kategori mentah
// smmflare, di sini cuma buat filter tabel, beda konteks pemakaian.
const PLATFORMS: { key: string; label: string; icon: IconType; match: string[] }[] = [
    { key: "instagram", label: "Instagram", icon: FaInstagram, match: ["instagram"] },
    { key: "youtube", label: "YouTube", icon: FaYoutube, match: ["youtube"] },
    { key: "tiktok", label: "TikTok", icon: FaTiktok, match: ["tiktok", "tik tok"] },
    { key: "twitter", label: "Twitter / X", icon: FaXTwitter, match: ["twitter", "x/twitter", " x "] },
    { key: "spotify", label: "Spotify", icon: FaSpotify, match: ["spotify"] },
    { key: "telegram", label: "Telegram", icon: FaTelegram, match: ["telegram"] },
    { key: "facebook", label: "Facebook", icon: FaFacebook, match: ["facebook"] },
    { key: "twitch", label: "Twitch", icon: FaTwitch, match: ["twitch"] },
    { key: "reddit", label: "Reddit", icon: FaRedditAlien, match: ["reddit"] },
    { key: "traffic", label: "Trafik Website", icon: FaGlobe, match: ["website traffic", "web traffic"] },
    { key: "seo", label: "Backlink SEO", icon: FaLink, match: ["seo", "backlink"] },
];

function detectPlatform(s: SmmServiceRow): string {
    const text = (s.category + " " + s.name).toLowerCase();
    for (const p of PLATFORMS) {
        if (p.match.some((m) => text.includes(m))) return p.key;
    }
    return "lainnya";
}

function formatMinutes(minutes: number): string {
    if (minutes < 1) return "< 1 menit";
    if (minutes < 60) return "± " + Math.round(minutes) + " menit";
    return "± " + Math.round((minutes / 60) * 10) / 10 + " jam";
}

const PAGE_SIZE = 50;

// Tabel semua layanan SMM aktif — bisa ribuan baris, jadi client-side
// paginated (bukan di-render semua sekaligus) supaya nggak berat. Data yang
// dipakai SAMA PERSIS dengan yang dipakai form pemesanan (getSmmCatalog()),
// nggak ada fetch tambahan. Klik nama layanan langsung lompat ke form beli
// dengan layanan itu ke-pilih otomatis (lihat ?service= di SmmView.tsx).
export default function SmmCatalogList({ services }: { services: SmmServiceRow[] }) {
    const [q, setQ] = useState("");
    const [platform, setPlatform] = useState("all");
    const [page, setPage] = useState(1);

    const withPlatform = useMemo(() => services.map((s) => ({ ...s, platform: detectPlatform(s) })), [services]);

    const filtered = useMemo(() => {
        const query = q.trim().toLowerCase();
        return withPlatform.filter((s) => {
            if (platform !== "all" && s.platform !== platform) return false;
            if (!query) return true;
            return s.name.toLowerCase().includes(query) || s.category.toLowerCase().includes(query) || String(s.providerServiceId).includes(query);
        });
    }, [withPlatform, q, platform]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const clampedPage = Math.min(page, totalPages);
    const pageRows = filtered.slice((clampedPage - 1) * PAGE_SIZE, clampedPage * PAGE_SIZE);

    // Estimasi cuma diambil buat layanan yang lagi KELIHATAN di halaman ini
    // (bukan seluruh katalog sekaligus) -- 1 RPC batched per pindah
    // halaman/filter, bukan 1 RPC per baris. Rata-ratanya dihitung dari
    // riwayat pesanan SEMUA pembeli buat layanan itu (lihat komentar RPC-nya),
    // jadi makin banyak orang beli layanan yang sama, makin akurat angkanya.
    const [eta, setEta] = useState<Record<string, SmmServiceEta>>({});
    const [etaLoading, setEtaLoading] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const ids = pageRows.map((s) => s.id);
        if (ids.length === 0) return;
        setEtaLoading(true);
        getSmmServicesEtaAction(ids).then((res) => {
            if (!cancelled) {
                setEta(res);
                setEtaLoading(false);
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clampedPage, q, platform]);

    return (
        <section className="d-card">
            <div className="d-card-head">
                <h2>Daftar layanan ({num(filtered.length)})</h2>
            </div>

            <div className="u-list-filters">
                <div className="u-input">
                    <input
                        placeholder="Cari layanan, kategori, atau ID..."
                        value={q}
                        onChange={(e) => {
                            setQ(e.target.value);
                            setPage(1);
                        }}
                        aria-label="Cari layanan"
                    />
                </div>
                <select
                    className="u-select u-list-platform"
                    value={platform}
                    onChange={(e) => {
                        setPlatform(e.target.value);
                        setPage(1);
                    }}
                    aria-label="Filter platform"
                >
                    <option value="all">Semua Platform</option>
                    {PLATFORMS.map((p) => (
                        <option key={p.key} value={p.key}>
                            {p.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="d-table-wrap">
                <table className="d-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Layanan</th>
                            <th>Kategori</th>
                            <th>Min/Maks</th>
                            <th>Harga</th>
                            <th>Estimasi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pageRows.map((s) => {
                            const e = eta[s.id];
                            return (
                                <tr key={s.id}>
                                    <td className="mute">{s.providerServiceId}</td>
                                    <td>
                                        <Link href={`/dashboard/smm?service=${s.id}`} className="u-list-link">
                                            {translateServiceName(s.name)}
                                        </Link>
                                    </td>
                                    <td className="mute">{translateServiceName(s.category)}</td>
                                    <td className="mute">
                                        {num(s.minQuantity)}–{num(s.maxQuantity)}
                                    </td>
                                    <td>
                                        <b>{rp(s.pricePer1000)}</b>/K
                                    </td>
                                    <td className={e && e.sampleSize > 0 && e.avgMinutes !== null ? "u-eta-ok" : "mute"}>
                                        {etaLoading && !e
                                            ? "…"
                                            : e && e.sampleSize > 0 && e.avgMinutes !== null
                                              ? formatMinutes(e.avgMinutes)
                                              : "Belum ada data"}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {pageRows.length === 0 && <div className="d-empty">Tidak ada layanan yang cocok.</div>}
            </div>

            {totalPages > 1 && (
                <div className="u-pager">
                    <button type="button" className="d-pill" disabled={clampedPage <= 1} onClick={() => setPage((p) => p - 1)}>
                        ← Sebelumnya
                    </button>
                    <span className="mute">
                        Halaman {clampedPage} / {totalPages}
                    </span>
                    <button type="button" className="d-pill" disabled={clampedPage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                        Selanjutnya →
                    </button>
                </div>
            )}
        </section>
    );
}
