import type { CSSProperties } from "react";
import Reveal from "./Reveal";

type Pack = {
    stars: string;
    note: string;
    /** jumlah bintang kecil yang ditampilkan di ikon (1-3) */
    size: 1 | 2 | 3;
    from: string;
    to: string;
    /** Isi harga kalau mau ditampilkan, contoh: "Rp 10.000". Kosong = tidak tampil. */
    price?: string;
};

const PACKS: Pack[] = [
    { stars: "50", note: "Untuk mencoba", size: 1, from: "#ffd75e", to: "#f0a000" },
    { stars: "100", note: "Paket dasar", size: 1, from: "#63d0ff", to: "#1c8ee6" },
    { stars: "250", note: "Paket menengah", size: 2, from: "#ffd75e", to: "#f0a000" },
    { stars: "500", note: "Paket besar", size: 2, from: "#63d0ff", to: "#1c8ee6" },
    { stars: "1.000", note: "Paket besar+", size: 3, from: "#ffd75e", to: "#f0a000" },
    { stars: "2.500", note: "Paket jumbo", size: 3, from: "#63d0ff", to: "#1c8ee6" },
];

const STAR = "M16 3 L19.5 12 L29 12.5 L21.5 18.5 L24 28 L16 22.8 L8 28 L10.5 18.5 L3 12.5 L12.5 12 Z";

function StarIcon({ size }: { size: 1 | 2 | 3 }) {
    if (size === 1) {
        return (
            <svg width="38" height="38" viewBox="0 0 32 32" aria-hidden="true">
                <path d={STAR} fill="#ffffff" strokeLinejoin="round" />
            </svg>
        );
    }
    if (size === 2) {
        return (
            <svg width="46" height="40" viewBox="0 0 46 40" aria-hidden="true">
                <g transform="translate(-2 6) scale(.72)">
                    <path d={STAR} fill="rgba(255,255,255,0.7)" />
                </g>
                <g transform="translate(14 0) scale(.95)">
                    <path d={STAR} fill="#ffffff" />
                </g>
            </svg>
        );
    }
    return (
        <svg width="50" height="42" viewBox="0 0 50 42" aria-hidden="true">
            <g transform="translate(-3 12) scale(.6)">
                <path d={STAR} fill="rgba(255,255,255,0.6)" />
            </g>
            <g transform="translate(31 12) scale(.6)">
                <path d={STAR} fill="rgba(255,255,255,0.6)" />
            </g>
            <g transform="translate(9 0) scale(.95)">
                <path d={STAR} fill="#ffffff" />
            </g>
        </svg>
    );
}

export default function Products() {
    return (
        <section id="produk" className="sec">
            <div className="sec-in">
                <Reveal>
                    <div className="sec-head">
                        <div>
                            <p className="eyebrow">Paket Stars</p>
                            <h2 className="h2">
                                Pilih jumlah Stars
                                <br />
                                sesuai kebutuhanmu
                            </h2>
                        </div>
                        <p className="lead">
                            Untuk dirimu sendiri atau dikirim ke teman. Masukkan username Telegram, bayar, dan Stars
                            langsung masuk.
                        </p>
                    </div>
                </Reveal>

                <div className="tiles tiles-stars">
                    {PACKS.map((p, i) => (
                        <a
                            key={p.stars}
                            href="/daftar"
                            className="tile"
                            style={{ "--tint": p.to, animationDelay: `${i * 40}ms` } as CSSProperties}
                        >
                            <span
                                className="plate"
                                style={{
                                    background: `linear-gradient(150deg, ${p.from}, ${p.to})`,
                                    boxShadow: `inset 0 2px 0 rgba(255,255,255,0.5), inset 0 -4px 0 rgba(0,0,0,0.12), 0 14px 22px ${p.to}55`,
                                }}
                            >
                                <StarIcon size={p.size} />
                            </span>
                            <span>
                                <span className="tile-name">{p.stars} Stars</span>
                                <span className="tile-item">{p.note}</span>
                            </span>
                            <span className="tile-foot">
                                {p.price ? <span className="chip">{p.price}</span> : <span className="chip">Telegram Stars</span>}
                                <span className="tile-go" aria-hidden="true">
                                    <svg width="16" height="16" viewBox="0 0 16 16">
                                        <path d="M3 8 H12 M8 4 L12 8 L8 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            </span>
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
}