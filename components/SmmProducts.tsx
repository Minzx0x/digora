import type { CSSProperties } from "react";
import type { IconType } from "react-icons";
import { FaInstagram, FaTiktok, FaYoutube, FaFacebook, FaXTwitter, FaTelegram } from "react-icons/fa6";
import Reveal from "./Reveal";

type Platform = {
    key: string;
    label: string;
    icon: IconType;
    color: string;
};

// Warna & ikon platform sama persis dengan yang dipakai di dashboard SMM
// Panel (components/SmmView.tsx) — biar konsisten, bukan warna baru sembarangan.
const PLATFORMS: Platform[] = [
    { key: "instagram", label: "Instagram", icon: FaInstagram, color: "#E4405F" },
    { key: "tiktok", label: "TikTok", icon: FaTiktok, color: "#010101" },
    { key: "youtube", label: "YouTube", icon: FaYoutube, color: "#FF0000" },
    { key: "facebook", label: "Facebook", icon: FaFacebook, color: "#1877F2" },
    { key: "twitter", label: "Twitter / X", icon: FaXTwitter, color: "#000000" },
    { key: "telegram", label: "Telegram", icon: FaTelegram, color: "#26A5E4" },
];

export default function SmmProducts() {
    return (
        <section id="smm" className="sec">
            <div className="sec-in">
                <Reveal>
                    <div className="sec-head">
                        <div>
                            <p className="eyebrow">SMM Panel</p>
                            <h2 className="h2">
                                Followers, likes, views
                                <br />
                                buat semua platform
                            </h2>
                        </div>
                        <p className="lead">
                            Naikkan engagement Instagram, TikTok, YouTube, dan lainnya. Pilih layanan, masukkan
                            link/username tujuan, dan pesanan diproses otomatis.
                        </p>
                    </div>
                </Reveal>

                <div className="tiles tiles-smm">
                    {PLATFORMS.map((p, i) => (
                        <a
                            key={p.key}
                            href="/daftar"
                            className="tile"
                            style={{ "--tint": p.color, animationDelay: `${i * 40}ms` } as CSSProperties}
                        >
                            <span
                                className="plate"
                                style={{
                                    background: p.color,
                                    boxShadow: `inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -4px 0 rgba(0,0,0,0.16), 0 14px 22px ${p.color}55`,
                                }}
                            >
                                <p.icon size={30} color="#ffffff" />
                            </span>
                            <span>
                                <span className="tile-name">{p.label}</span>
                                <span className="tile-item">Followers · Likes · Views</span>
                            </span>
                            <span className="tile-foot">
                                <span className="chip">SMM Panel</span>
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
