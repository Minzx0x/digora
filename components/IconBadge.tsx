import type { CSSProperties } from "react";
import type { IconType } from "react-icons";

// Badge ikon flat warna-warni — pola yang sama dipakai di lengkungan hero
// (HeroArc.tsx) dan sekarang dipakai ulang di section lain (Cara Order,
// Kenapa Digora, CTA) biar satu bahasa visual, gantiin ilustrasi koin 3D
// glossy yang lama supaya seluruh landing page terasa konsisten.
export default function IconBadge({
    icon: Icon,
    bg,
    color = "#ffffff",
    size = 56,
    className,
    style,
}: {
    icon: IconType;
    bg: string;
    color?: string;
    size?: number;
    className?: string;
    style?: CSSProperties;
}) {
    return (
        <div
            // "icon-badge" (bukan display:grid inline) SENGAJA biar class kayak
            // .cta-top yang nge-hide badge ini di mobile masih bisa menang lewat
            // cascade CSS biasa -- inline style display:grid bakal selalu ngalahin
            // class display:none kalau dipasang inline, jadi harus lewat class juga.
            className={`icon-badge${className ? ` ${className}` : ""}`}
            style={{
                width: size,
                height: size,
                borderRadius: size * 0.32,
                background: bg,
                color,
                fontSize: size * 0.5,
                boxShadow: "0 10px 20px rgba(11,11,12,0.16)",
                ...style,
            }}
        >
            <Icon />
        </div>
    );
}
