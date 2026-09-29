"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { IconType } from "react-icons";
import {
    FaFilter,
    FaInstagram,
    FaYoutube,
    FaTiktok,
    FaXTwitter,
    FaSpotify,
    FaTelegram,
    FaFacebook,
    FaTwitch,
    FaRedditAlien,
    FaGlobe,
    FaLink,
    FaEllipsis,
    FaWallet,
} from "react-icons/fa6";
import { buySmmOrderAction, getSmmServiceEtaAction, type SmmServiceRow } from "@/lib/actions/smm";
import { translateServiceName } from "@/lib/smm-translate";

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");

// Dropdown "Kategori" yang kelihatan customer pakai field category MENTAH
// dari smmflare apa adanya (persis kayak panel provider aslinya) — bukan
// dikelompokkan ulang. PLATFORMS di bawah ini cuma dipakai INTERNAL: buat
// nebak platform dari 1 layanan terpilih, dipakai buat (a) contoh placeholder
// link yang sesuai platform, (b) ikon kecil di depan tiap opsi kategori.
const PLATFORMS: { key: string; label: string; icon: IconType; color: string; match: string[] }[] = [
    { key: "instagram", label: "Instagram", icon: FaInstagram, color: "#E4405F", match: ["instagram"] },
    { key: "youtube", label: "YouTube", icon: FaYoutube, color: "#FF0000", match: ["youtube"] },
    { key: "tiktok", label: "TikTok", icon: FaTiktok, color: "#010101", match: ["tiktok", "tik tok"] },
    { key: "twitter", label: "Twitter / X", icon: FaXTwitter, color: "#000000", match: ["twitter", "x/twitter", " x "] },
    { key: "spotify", label: "Spotify", icon: FaSpotify, color: "#1DB954", match: ["spotify"] },
    { key: "telegram", label: "Telegram", icon: FaTelegram, color: "#26A5E4", match: ["telegram"] },
    { key: "facebook", label: "Facebook", icon: FaFacebook, color: "#1877F2", match: ["facebook"] },
    { key: "twitch", label: "Twitch", icon: FaTwitch, color: "#9146FF", match: ["twitch"] },
    { key: "reddit", label: "Reddit", icon: FaRedditAlien, color: "#FF4500", match: ["reddit"] },
    { key: "traffic", label: "Trafik Website", icon: FaGlobe, color: "#2540ff", match: ["website traffic", "web traffic"] },
    { key: "seo", label: "Backlink SEO", icon: FaLink, color: "#2540ff", match: ["seo", "backlink"] },
];

// Nama layanan mentah biasanya format "X | Y | Z" (mis. "TikTok Views | High
// Quality | Fast | Instant Start") — dipecah jadi poin-poin terjemahan biar
// kebaca kayak daftar "Deskripsi", bukan satu kalimat panjang di dropdown.
function nameSegments(name: string): string[] {
    return name
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(translateServiceName);
}

// Provider nggak kasih data "estimasi delivery" lewat API — tapi banyak nama
// layanan MEMANG udah nyebut kecepatannya sendiri (mis. "Instant Start" atau
// "Speed: 100K+/Day"). Ini diambil dari teks nama asli (bukan dikarang), cuma
// ditonjolkan biar kebaca kayak info "kecepatan" yang jelas.
function extractSpeed(name: string): string {
    const speedMatch = name.match(/speed:?\s*([^|]+)/i);
    if (speedMatch) return speedMatch[1].trim();
    if (/instant/i.test(name)) return "Instan";
    return "—";
}

// PENTING: flag boolean "refill" dari API smmflare kadang KONTRADIKTIF sama
// teks nama layanannya sendiri (kejadian nyata: API bilang refill:false, tapi
// namanya jelas nyebut "90 Days Refill"). Nama layanan lebih spesifik & lebih
// bisa dipercaya soal DURASI garansinya, jadi dicek dari teks nama dulu —
// boolean API cuma jadi cadangan kalau namanya sama sekali nggak nyebut apa-apa.
function extractGaransi(name: string, refillFlag: boolean): string {
    if (/lifetime refill/i.test(name)) return "Seumur hidup";
    const days = name.match(/(\d+)\s*days?\s*(?:auto\s*)?refill/i);
    if (days) return `${days[1]} hari`;
    if (/no refill/i.test(name)) return "Tidak ada";
    if (/auto\s*refill/i.test(name)) return "Otomatis";
    if (/\brefill\b/i.test(name)) return "Ada";
    return refillFlag ? "Ada" : "Tidak ada";
}

// Ekstrak angka+satuan dari "Speed: 100K+/Day" / "Speed: 20K/Hour" dkk jadi
// { amount, per: "hari"|"jam" } — buat dasar hitung estimasi selesai (bukan
// buat ditampilkan mentah).
function parseSpeedRate(name: string): { amount: number; per: "hari" | "jam" } | null {
    const m = name.match(/speed:?\s*([\d.,]+)\s*([km])?\+?\s*\/?\s*(day|hour|d|h)\b/i);
    if (!m) return null;
    let amount = parseFloat(m[1].replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0) return null;
    const suffix = (m[2] ?? "").toLowerCase();
    if (suffix === "k") amount *= 1_000;
    if (suffix === "m") amount *= 1_000_000;
    const per = /^h/i.test(m[3]) ? "jam" : "hari";
    return { amount, per };
}

// Estimasi waktu selesai = jumlah pesanan ÷ kecepatan asli dari nama layanan —
// perhitungan matematis dari angka yang memang tertulis, bukan tebakan. Kalau
// nama-nya nggak nyebut kecepatan sama sekali, jujur tampilin fallback biasa
// (Instan / "—") daripada ngarang angka.
function estimateEta(name: string, quantity: number): string {
    if (quantity <= 0) return extractSpeed(name);
    const rate = parseSpeedRate(name);
    if (!rate) return extractSpeed(name);
    const units = quantity / rate.amount;
    if (rate.per === "hari") {
        const hours = units * 24;
        if (hours < 1) return "± " + Math.max(1, Math.ceil(hours * 60)) + " menit";
        return "± " + Math.ceil(hours) + " jam";
    }
    const minutes = units * 60;
    if (minutes < 1) return "Instan";
    return "± " + Math.ceil(minutes) + " menit";
}

function formatMinutes(minutes: number): string {
    if (minutes < 1) return "< 1 menit";
    if (minutes < 60) return "± " + Math.round(minutes) + " menit";
    return "± " + Math.round((minutes / 60) * 10) / 10 + " jam";
}

function detectPlatform(s: SmmServiceRow): string {
    const text = (s.category + " " + s.name).toLowerCase();
    for (const p of PLATFORMS) {
        if (p.match.some((m) => text.includes(m))) return p.key;
    }
    return "lainnya";
}

// Contoh link di placeholder ikut platform layanan yang lagi dipilih — biar
// nggak selalu nunjukin "instagram.com" walau yang dipilih TikTok/Twitter/dst.
const LINK_EXAMPLE: Record<string, string> = {
    instagram: "https://instagram.com/username",
    youtube: "https://youtube.com/@username",
    tiktok: "https://tiktok.com/@username",
    twitter: "https://x.com/username",
    spotify: "https://open.spotify.com/track/xxxxxxxx",
    telegram: "https://t.me/username",
    facebook: "https://facebook.com/username",
    twitch: "https://twitch.tv/username",
    reddit: "https://reddit.com/r/nama_subreddit",
    traffic: "https://website-kamu.com",
    seo: "https://website-kamu.com",
    lainnya: "https://link-tujuan.com/...",
};

export default function SmmView({ catalog, saldo }: { catalog: SmmServiceRow[]; saldo: number }) {
    const router = useRouter();
    // Datang dari /dashboard/daftar-layanan (klik satu layanan di tabel) —
    // langsung ke-pilih di sini, bukan cuma serviceId-nya doang, platform &
    // kategori juga ikut disetel biar combobox-nya konsisten nampilin pilihan
    // yang sama (bukan nyangkut di filter "Semua" yang nggak match).
    const searchParams = useSearchParams();
    const deepLinkService = useMemo(() => {
        const id = searchParams.get("service");
        return id ? (catalog.find((s) => s.id === id) ?? null) : null;
    }, [searchParams, catalog]);

    // Tingkat 1: Platform (ikon brand asli, dideteksi dari nama+kategori).
    const withPlatform = useMemo(() => catalog.map((s) => ({ ...s, platform: detectPlatform(s) })), [catalog]);
    const availablePlatforms = useMemo(() => {
        const present = new Set(withPlatform.map((s) => s.platform));
        const known = PLATFORMS.filter((p) => present.has(p.key));
        return present.has("lainnya")
            ? [...known, { key: "lainnya", label: "Lainnya", icon: FaEllipsis, color: "var(--d-text-mute)", match: [] as string[] }]
            : known;
    }, [withPlatform]);

    const [platform, setPlatform] = useState(() => (deepLinkService ? detectPlatform(deepLinkService) : "all"));
    const servicesInPlatform = useMemo(
        () => (platform === "all" ? withPlatform : withPlatform.filter((s) => s.platform === platform)),
        [withPlatform, platform],
    );

    // Tingkat 2: Kategori MENTAH (persis field category dari smmflare, apa
    // adanya) — di-scope ke platform yang lagi dipilih di tingkat 1. Urutan
    // dipertahankan sesuai kemunculan pertama (server sudah ORDER BY category).
    const distinctCategories = useMemo(() => {
        const seen = new Set<string>();
        const out: string[] = [];
        for (const s of servicesInPlatform) {
            if (!seen.has(s.category)) {
                seen.add(s.category);
                out.push(s.category);
            }
        }
        return out;
    }, [servicesInPlatform]);

    // Ikon kecil di depan tiap opsi kategori — ditebak dari platform layanan
    // PERTAMA yang punya kategori itu (murni kosmetik, bukan filter).
    const categoryIcon = useMemo(() => {
        const map = new Map<string, (typeof PLATFORMS)[number] | null>();
        for (const cat of distinctCategories) {
            const sample = servicesInPlatform.find((s) => s.category === cat);
            const p = sample ? PLATFORMS.find((pl) => pl.key === sample.platform) : undefined;
            map.set(cat, p ?? null);
        }
        return map;
    }, [distinctCategories, servicesInPlatform]);

    const [rawCategory, setRawCategory] = useState(() => deepLinkService?.category ?? ""); // "" = Semua
    const servicesInCategory = useMemo(
        () => (rawCategory === "" ? servicesInPlatform : servicesInPlatform.filter((s) => s.category === rawCategory)),
        [servicesInPlatform, rawCategory],
    );

    const [categoryQuery, setCategoryQuery] = useState("");
    const [categoryOpen, setCategoryOpen] = useState(false);
    const categoryComboRef = useRef<HTMLDivElement>(null);
    const filteredCategories = useMemo(() => {
        const q = categoryQuery.trim().toLowerCase();
        if (!q) return distinctCategories;
        return distinctCategories.filter((c) => c.toLowerCase().includes(q));
    }, [distinctCategories, categoryQuery]);

    const [serviceId, setServiceId] = useState(() => deepLinkService?.id ?? servicesInCategory[0]?.id ?? "");
    const service = catalog.find((s) => s.id === serviceId) ?? null;
    const linkExample = service ? (LINK_EXAMPLE[detectPlatform(service)] ?? LINK_EXAMPLE.lainnya) : LINK_EXAMPLE.lainnya;

    // Dropdown "Layanan" bisa berisi ratusan opsi yang teksnya panjang & mirip
    // satu sama lain (satu platform aja bisa punya banyak varian) — <select>
    // native jadi nggak praktis buat dicari manual. Ini combobox sendiri: ketik
    // buat filter, klik salah satu buat pilih, klik di luar buat nutup.
    const [serviceQuery, setServiceQuery] = useState("");
    const [serviceOpen, setServiceOpen] = useState(false);
    const comboRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onClickOutside(e: MouseEvent) {
            if (comboRef.current && !comboRef.current.contains(e.target as Node)) setServiceOpen(false);
            if (categoryComboRef.current && !categoryComboRef.current.contains(e.target as Node)) setCategoryOpen(false);
        }
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);

    function serviceLabel(s: SmmServiceRow): string {
        return `#${s.providerServiceId} — ${translateServiceName(s.name)} — ${rp(s.pricePer1000)}/1000`;
    }

    const filteredServices = useMemo(() => {
        const q = serviceQuery.trim().toLowerCase();
        if (!q) return servicesInCategory;
        return servicesInCategory.filter((s) => serviceLabel(s).toLowerCase().includes(q) || String(s.providerServiceId).includes(q));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [servicesInCategory, serviceQuery]);

    // Estimasi dari riwayat pesanan ASLI toko sendiri (bukan dari smmflare) —
    // ditarik ulang tiap ganti layanan. Belum ada riwayat = sampleSize 0,
    // fallback ke perhitungan dari teks nama layanan (lihat estimateEta).
    const [eta, setEta] = useState<{ avgMinutes: number | null; sampleSize: number }>({ avgMinutes: null, sampleSize: 0 });
    useEffect(() => {
        if (!serviceId) {
            setEta({ avgMinutes: null, sampleSize: 0 });
            return;
        }
        let cancelled = false;
        getSmmServiceEtaAction(serviceId).then((res) => {
            if (!cancelled) setEta(res);
        });
        return () => {
            cancelled = true;
        };
    }, [serviceId]);

    const [link, setLink] = useState("");
    const [quantity, setQuantity] = useState("");
    const [err, setErr] = useState("");
    const [buying, setBuying] = useState(false);

    function pickPlatform(key: string) {
        setPlatform(key);
        setRawCategory("");
        const pool = key === "all" ? withPlatform : withPlatform.filter((s) => s.platform === key);
        setServiceId(pool[0]?.id ?? "");
        setCategoryQuery("");
        setServiceQuery("");
        setQuantity("");
        setErr("");
    }

    function pickCategory(cat: string) {
        setRawCategory(cat);
        const pool = cat === "" ? servicesInPlatform : servicesInPlatform.filter((s) => s.category === cat);
        setServiceId(pool[0]?.id ?? "");
        setCategoryQuery("");
        setCategoryOpen(false);
        setServiceQuery("");
        setQuantity("");
        setErr("");
    }

    function pickService(id: string) {
        setServiceId(id);
        setServiceQuery("");
        setServiceOpen(false);
        setQuantity("");
        setErr("");
    }

    const quantityNum = Math.max(0, Math.round(Number(quantity) || 0));
    const total = service ? Math.round((service.pricePer1000 * quantityNum) / 1000) : 0;
    const kurang = Math.max(0, total - saldo);
    const qtyTooLow = !!service && quantityNum > 0 && quantityNum < service.minQuantity;
    const qtyTooHigh = !!service && quantityNum > service.maxQuantity;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (!service) {
            setErr("Pilih layanan dulu.");
            return;
        }
        if (quantityNum < service.minQuantity || quantityNum > service.maxQuantity) {
            setErr(`Jumlah harus antara ${num(service.minQuantity)}-${num(service.maxQuantity)}.`);
            return;
        }
        if (!link.trim()) {
            setErr("Isi link tujuan dulu.");
            return;
        }
        if (saldo < total) {
            setErr(`Saldo kurang ${rp(kurang)}. Isi saldo dulu.`);
            return;
        }
        setErr("");
        setBuying(true);
        const res = await buySmmOrderAction({ serviceId: service.id, targetLink: link.trim(), quantity: quantityNum });
        setBuying(false);
        if (res.error) {
            setErr(res.error);
            return;
        }
        // Redirect ke Pesanan Saya alih-alih nampilin pesan sukses inline di
        // halaman ini — pesan inline gampang ke-lewat kalau posisi scroll-nya
        // nggak pas, sedangkan di Pesanan Saya order barunya jelas kelihatan
        // sebagai baris paling atas.
        router.push("/dashboard/riwayat");
        router.refresh();
    }

    if (catalog.length === 0) {
        return (
            <section className="d-card">
                <div className="d-card-head">
                    <h2>SMM Panel</h2>
                </div>
                <p className="d-note">Belum ada layanan tersedia. Hubungi admin.</p>
            </section>
        );
    }

    return (
        <section className="d-card">
            <div className="d-card-head">
                <h2>SMM Panel — Followers, Likes &amp; Views</h2>
            </div>

            <form className="u-form" onSubmit={submit} noValidate>
                <div>
                    <div className="s-step">
                        <i>1</i>Pilih layanan
                    </div>
                    <div className="u-label">Platform</div>
                    <div className="u-platform-grid" role="tablist" aria-label="Platform">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={platform === "all"}
                            className={`u-platform ${platform === "all" ? "on" : ""}`}
                            onClick={() => pickPlatform("all")}
                        >
                            <FaFilter size={16} />
                            Semua
                        </button>
                        {availablePlatforms.map((p) => (
                            <button
                                key={p.key}
                                type="button"
                                role="tab"
                                aria-selected={platform === p.key}
                                className={`u-platform ${platform === p.key ? "on" : ""}`}
                                onClick={() => pickPlatform(p.key)}
                            >
                                <p.icon size={16} color={platform === p.key ? undefined : p.color} />
                                {p.label}
                            </button>
                        ))}
                    </div>

                    <div className="u-label u-label-mt">Kategori</div>
                    <div className="u-combo" ref={categoryComboRef}>
                        <input
                            className="u-select"
                            value={categoryOpen ? categoryQuery : rawCategory || "Semua"}
                            onFocus={() => {
                                setCategoryOpen(true);
                                setCategoryQuery("");
                            }}
                            onChange={(e) => setCategoryQuery(e.target.value)}
                            placeholder="Cari kategori…"
                            aria-label="Cari kategori"
                            autoComplete="off"
                        />
                        {categoryOpen && (
                            <div className="u-combo-list" role="listbox">
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={rawCategory === ""}
                                    className={`u-combo-opt ${rawCategory === "" ? "on" : ""}`}
                                    onClick={() => pickCategory("")}
                                >
                                    <FaFilter size={13} /> Semua
                                </button>
                                {filteredCategories.length === 0 && <div className="u-combo-empty">Nggak ada kategori yang cocok.</div>}
                                {filteredCategories.map((cat) => {
                                    const p = categoryIcon.get(cat);
                                    const Icon = p?.icon ?? FaEllipsis;
                                    return (
                                        <button
                                            type="button"
                                            key={cat}
                                            role="option"
                                            aria-selected={cat === rawCategory}
                                            className={`u-combo-opt ${cat === rawCategory ? "on" : ""}`}
                                            onClick={() => pickCategory(cat)}
                                        >
                                            <Icon size={13} color={p?.color ?? "var(--d-text-mute-2)"} /> {cat}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="u-label u-label-mt">Layanan</div>
                    <div className="u-combo" ref={comboRef}>
                        <input
                            className="u-select"
                            value={serviceOpen ? serviceQuery : service ? serviceLabel(service) : ""}
                            onFocus={() => {
                                setServiceOpen(true);
                                setServiceQuery("");
                            }}
                            onChange={(e) => setServiceQuery(e.target.value)}
                            placeholder="Cari nama atau ID layanan…"
                            aria-label="Cari layanan"
                            autoComplete="off"
                        />
                        {serviceOpen && (
                            <div className="u-combo-list" role="listbox">
                                {filteredServices.length === 0 && <div className="u-combo-empty">Nggak ada layanan yang cocok.</div>}
                                {filteredServices.map((s) => (
                                    <button
                                        type="button"
                                        key={s.id}
                                        role="option"
                                        aria-selected={s.id === serviceId}
                                        className={`u-combo-opt ${s.id === serviceId ? "on" : ""}`}
                                        onClick={() => pickService(s.id)}
                                    >
                                        {serviceLabel(s)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {service && (
                        <div className="s-detail">
                            <div className="s-detail-stats">
                                <div className="s-detail-stat">
                                    <span>{eta.sampleSize > 0 || quantityNum > 0 ? "Estimasi selesai" : "Kecepatan"}</span>
                                    <b>
                                        {eta.sampleSize > 0 && eta.avgMinutes !== null
                                            ? formatMinutes(eta.avgMinutes)
                                            : estimateEta(service.name, quantityNum)}
                                    </b>
                                    {eta.sampleSize > 0 && (
                                        <small className="mute d-mute-xs">dari {eta.sampleSize} pesanan sebelumnya</small>
                                    )}
                                </div>
                                <div className="s-detail-stat">
                                    <span>Min – Maks</span>
                                    <b>
                                        {num(service.minQuantity)} – {num(service.maxQuantity)}
                                    </b>
                                </div>
                                <div className="s-detail-stat">
                                    <span>Garansi</span>
                                    <b className={extractGaransi(service.name, service.refill) !== "Tidak ada" ? "ok" : ""}>
                                        {extractGaransi(service.name, service.refill)}
                                    </b>
                                </div>
                            </div>
                            <div className="s-detail-desc">
                                <b>Deskripsi</b>
                                <ul>
                                    <li>Kategori: {service.category}</li>
                                    {nameSegments(service.name).map((seg, i) => (
                                        <li key={i}>{seg}</li>
                                    ))}
                                    <li>{service.dripfeed ? "Mendukung isi bertahap (dripfeed)" : "Dikirim langsung, bukan bertahap"}</li>
                                </ul>
                            </div>
                            <div className="s-detail-desc s-detail-notes">
                                <b>⚠️ Catatan</b>
                                <ul>
                                    <li>Pastikan akun/postingan kamu publik sebelum pesan.</li>
                                    <li>Kecepatan proses bisa lebih lambat kalau layanan lagi ramai.</li>
                                    <li>Jangan pesan lagi di link yang sama sebelum pesanan pertama selesai.</li>
                                    <li>Pesanan tidak bisa dibatalkan setelah mulai diproses.</li>
                                    <li>Ada kendala? Hubungi admin lewat menu Bantuan.</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>

                <div className="u-cols">
                    <div>
                        <div className="s-step">
                            <i>2</i>Link tujuan
                        </div>
                        <div className="u-input">
                            <input
                                value={link}
                                onChange={(e) => {
                                    setLink(e.target.value);
                                    setErr("");
                                }}
                                placeholder={linkExample}
                                aria-label="Link tujuan"
                                autoComplete="off"
                            />
                        </div>
                        <p className="d-note d-note-sm-mt">Link profil/postingan yang mau ditambah layanannya. Pastikan linknya publik.</p>

                        <div className="s-step s-step-mt">
                            <i>3</i>Jumlah
                        </div>
                        <div className={`u-input ${qtyTooLow || qtyTooHigh ? "err" : ""}`}>
                            <input
                                inputMode="numeric"
                                value={quantity}
                                onChange={(e) => {
                                    setQuantity(e.target.value.replace(/\D/g, ""));
                                    setErr("");
                                }}
                                placeholder={service ? `${num(service.minQuantity)}–${num(service.maxQuantity)}` : ""}
                                aria-label="Jumlah"
                            />
                        </div>
                        {service && !qtyTooLow && !qtyTooHigh && (
                            <p className="d-note d-note-sm-mt">
                                Min {num(service.minQuantity)} – Max {num(service.maxQuantity)}
                            </p>
                        )}
                        {qtyTooLow && <span className="u-custom-price bad">Minimal {num(service!.minQuantity)}</span>}
                        {qtyTooHigh && <span className="u-custom-price bad">Maksimal {num(service!.maxQuantity)}</span>}

                        <div className="s-step s-step-mt">
                            <i>4</i>Pembayaran
                        </div>
                        <div className={`u-saldo-box ${kurang > 0 ? "low" : ""}`}>
                            <span className="u-saldo-box-ico" aria-hidden="true">
                                <FaWallet size={18} />
                            </span>
                            <div>
                                <span>Saldo kamu</span>
                                <b>{rp(saldo)}</b>
                            </div>
                            {kurang > 0 ? (
                                <Link href="/dashboard/saldo">Kurang {rp(kurang)} · Isi saldo →</Link>
                            ) : (
                                <small>✓ Cukup untuk pembelian ini</small>
                            )}
                        </div>
                    </div>

                    <div className="u-sum">
                        <div className="u-sum-head">Ringkasan pesanan</div>
                        <div className="u-row">
                            <span>Layanan</span>
                            <b>{service ? `#${service.providerServiceId} — ${translateServiceName(service.name)}` : "-"}</b>
                        </div>
                        <div className="u-row">
                            <span>Jumlah</span>
                            <b>{num(quantityNum)}</b>
                        </div>
                        <div className="u-row">
                            <span>Sisa saldo</span>
                            <b>{rp(Math.max(0, saldo - total))}</b>
                        </div>
                        <div className="u-row total">
                            <span>Total</span>
                            <b>{rp(total)}</b>
                        </div>
                        <button
                            className="d-btn u-go"
                            type="submit"
                            disabled={kurang > 0 || buying || qtyTooLow || qtyTooHigh || quantityNum === 0}
                        >
                            {buying ? "Memproses…" : "Beli dengan saldo"}
                        </button>
                        {err && <div className="u-bad">{err}</div>}
                    </div>
                </div>
            </form>
        </section>
    );
}
