import { FaTelegram, FaInstagram, FaTiktok, FaYoutube, FaFacebook, FaXTwitter, FaChevronDown } from "react-icons/fa6";
import IconBadge from "./IconBadge";

const W = 900;
const H = 300;

// Ikon platform yang melayang di sekitar lengkungan, mengelilingi logo Digora
// di tengah — gaya "arc illustration" ala landing page agency (logo besar +
// brand-brand yang didukung tersusun melengkung di bawahnya). Warna tiap
// badge pakai warna brand asli platformnya (sama seperti tile SMM Panel di
// SmmProducts.tsx), bukan warna custom, biar langsung dikenali. 6 platform
// persis yang didukung SmmProducts.tsx (bukan asal tambah) -- ukurannya
// berjenjang (paling besar di ujung, mengecil ke tengah) biar tetap kerasa
// "ramai tapi rapi", bukan numpuk.
const ICONS: { Icon: typeof FaTelegram; bg: string; x: number; y: number; size: number; delay: string }[] = [
    { Icon: FaTelegram, bg: "#26A5E4", x: 85, y: 120, size: 108, delay: "-1s" },
    { Icon: FaFacebook, bg: "#1877F2", x: 220, y: 185, size: 90, delay: "-2.5s" },
    { Icon: FaTiktok, bg: "#000000", x: 380, y: 235, size: 78, delay: "-4s" },
    { Icon: FaYoutube, bg: "#FF0000", x: 520, y: 235, size: 78, delay: "-1.5s" },
    { Icon: FaXTwitter, bg: "#000000", x: 680, y: 185, size: 90, delay: "-3.5s" },
    { Icon: FaInstagram, bg: "#E4405F", x: 815, y: 120, size: 108, delay: "-2s" },
];

/** Ilustrasi hero: ikon platform melengkung. Ukuran desain tetap 900x300, di-scale dari luar (lihat Hero.tsx). */
export default function HeroArc() {
    return (
        <div style={{ position: "relative", width: W, height: H }} aria-hidden="true">
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
                <path
                    d={`M60,120 C180,220 320,240 ${W / 2},240 C580,240 720,220 840,120`}
                    fill="none"
                    stroke="#c9d1ff"
                    strokeWidth="2"
                    strokeDasharray="2 8"
                    strokeLinecap="round"
                />
            </svg>

            {ICONS.map(({ Icon, bg, x, y, size, delay }, i) => (
                <IconBadge
                    key={i}
                    icon={Icon}
                    bg={bg}
                    size={size}
                    className={i % 2 === 0 ? "float-slow" : "float"}
                    style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", animationDelay: delay }}
                />
            ))}

            <a
                href="#produk"
                aria-label="Lihat produk"
                style={{
                    position: "absolute",
                    left: W / 2,
                    top: H - 24,
                    transform: "translate(-50%, -50%)",
                    display: "grid",
                    placeItems: "center",
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    border: "1.5px solid #e4e6ee",
                    color: "#8b8b94",
                    background: "#ffffff",
                }}
            >
                <FaChevronDown size={13} />
            </a>
        </div>
    );
}
