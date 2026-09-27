import type { CSSProperties } from "react";

type P = { style?: CSSProperties; className?: string; scale?: number };

export function BoltCoin({ style, className, scale = 1 }: P) {
    return (
        <svg
            style={{ transform: "rotate(-10deg)", filter: "drop-shadow(0 20px 16px rgba(10,20,90,0.34))", ...style }}
            width={172 * scale}
            height={160 * scale}
            viewBox="0 0 172 160"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="bS" gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="150" y2="0">
                    <stop offset="0" stopColor="#0a2f6b" />
                    <stop offset="0.35" stopColor="#2f8bff" />
                    <stop offset="1" stopColor="#061f4d" />
                </linearGradient>
                <radialGradient id="bT" cx="30%" cy="24%" r="85%">
                    <stop offset="0" stopColor="#d6ecff" />
                    <stop offset="0.4" stopColor="#52a8ff" />
                    <stop offset="0.85" stopColor="#1c62d6" />
                    <stop offset="1" stopColor="#12469e" />
                </radialGradient>
                <linearGradient id="bR" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#0a2a5c" />
                    <stop offset="1" stopColor="#2377e0" />
                </linearGradient>
                <linearGradient id="bB" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fff2a8" />
                    <stop offset="1" stopColor="#ffb800" />
                </linearGradient>
            </defs>
            <ellipse cx="82" cy="84" rx="68" ry="60" fill="url(#bS)" />
            <rect x="14" y="68" width="136" height="16" fill="url(#bS)" />
            <ellipse cx="82" cy="68" rx="68" ry="60" fill="url(#bT)" />
            <ellipse cx="82" cy="68" rx="61" ry="53" fill="none" stroke="#d9eeff" strokeOpacity="0.6" strokeWidth="2.5" />
            <ellipse cx="82" cy="68" rx="50" ry="43" fill="url(#bR)" stroke="#0a3a80" strokeWidth="3" />
            <ellipse cx="82" cy="72" rx="48" ry="40" fill="none" stroke="#000000" strokeOpacity="0.25" strokeWidth="4" />
            <path d="M92 40 L56 82 H78 L70 112 L110 66 H86 Z" fill="#4a3200" opacity="0.5" transform="translate(4 6)" />
            <path d="M92 40 L56 82 H78 L70 112 L110 66 H86 Z" fill="#c98a00" transform="translate(0 4)" />
            <path d="M92 40 L56 82 H78 L70 112 L110 66 H86 Z" fill="url(#bB)" stroke="#ffffff" strokeWidth="3.5" strokeLinejoin="round" />
            <path d="M32 40 C44 18 84 10 110 24" fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="5" strokeLinecap="round" />
            <ellipse cx="128" cy="98" rx="10" ry="4" fill="#ffffff" opacity="0.28" transform="rotate(50 128 98)" />
        </svg>
    );
}

export function Plane({ style, className, scale = 1 }: P) {
    return (
        <svg
            style={{ transform: "rotate(-8deg)", filter: "drop-shadow(0 20px 16px rgba(10,20,90,0.3))", ...style }}
            width={196 * scale}
            height={158 * scale}
            viewBox="0 0 196 158"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <path id="plane" d="M14 78 L182 16 L112 140 L76 122 L92 98 Z" />
                <linearGradient id="pl1" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#dcecff" />
                </linearGradient>
                <linearGradient id="pl2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#bcdcfb" />
                    <stop offset="1" stopColor="#8fc0f0" />
                </linearGradient>
            </defs>
            <use href="#plane" y="14" fill="#2f5f9e" />
            <use href="#plane" y="11" fill="#3a6dae" />
            <use href="#plane" y="8" fill="#457bbc" />
            <use href="#plane" y="5" fill="#5189c8" />
            <use href="#plane" y="2" fill="#5f98d6" />
            <path d="M14 78 L182 16 L92 98 Z" fill="url(#pl1)" />
            <path d="M182 16 L112 140 L92 98 Z" fill="url(#pl2)" />
            <path d="M92 98 L112 140 L76 122 Z" fill="#7fb2ea" />
            <path d="M14 78 L182 16 L112 140 L76 122 L92 98 Z" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="2" strokeLinejoin="round" />
            <path d="M92 98 L182 16" fill="none" stroke="#9cc6f2" strokeWidth="1.5" />
            <path d="M30 74 L120 40" fill="none" stroke="#ffffff" strokeOpacity="0.9" strokeWidth="4" strokeLinecap="round" />
        </svg>
    );
}

export function YellowRing({ style, className, scale = 1 }: P) {
    return (
        <svg
            style={{ filter: "drop-shadow(0 6px 4px rgba(120,90,0,0.25))", ...style }}
            width={54 * scale}
            height={54 * scale}
            viewBox="0 0 54 54"
            className={className}
            aria-hidden="true"
        >
            <ellipse cx="27" cy="29" rx="19" ry="17" fill="none" stroke="#c99a00" strokeWidth="5" transform="rotate(-20 27 29)" />
            <ellipse cx="27" cy="27" rx="19" ry="17" fill="none" stroke="#ffd21f" strokeWidth="5" transform="rotate(-20 27 27)" />
        </svg>
    );
}

export function StarCoin({ style, className, scale = 1 }: P) {
    return (
        <svg
            style={{ transform: "rotate(-6deg)", filter: "drop-shadow(0 22px 20px rgba(10,20,90,0.32))", ...style }}
            width={254 * scale}
            height={280 * scale}
            viewBox="0 0 254 280"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="tS" gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="230" y2="0">
                    <stop offset="0" stopColor="#8b90d8" />
                    <stop offset="0.4" stopColor="#d9dcf8" />
                    <stop offset="1" stopColor="#6e73bd" />
                </linearGradient>
                <radialGradient id="tT" cx="36%" cy="26%" r="92%">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.7" stopColor="#eef0fb" />
                    <stop offset="1" stopColor="#cfd3ee" />
                </radialGradient>
                <radialGradient id="tG" cx="36%" cy="26%" r="88%">
                    <stop offset="0" stopColor="#a9e4ff" />
                    <stop offset="0.5" stopColor="#2b9df0" />
                    <stop offset="1" stopColor="#0b4a9a" />
                </radialGradient>
                <linearGradient id="tBl" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffe680" />
                    <stop offset="1" stopColor="#f0a000" />
                </linearGradient>
                <filter id="tF" x="-30%" y="-30%" width="160%" height="170%">
                    <feDropShadow dx="0" dy="5" stdDeviation="3.5" floodColor="#000000" floodOpacity="0.45" />
                </filter>
            </defs>
            <ellipse cx="122" cy="142" rx="108" ry="112" fill="url(#tS)" />
            <rect x="14" y="122" width="216" height="20" fill="url(#tS)" />
            <ellipse cx="122" cy="122" rx="108" ry="112" fill="url(#tT)" />
            <ellipse cx="122" cy="122" rx="101" ry="105" fill="none" stroke="#ffffff" strokeWidth="3" />
            <g>
                <circle cx="44" cy="70" r="4" fill="#e4483c" />
                <circle cx="30" cy="118" r="5" fill="#2f5cff" />
                <circle cx="56" cy="176" r="4" fill="#ffc21f" />
                <circle cx="154" cy="28" r="4" fill="#2f5cff" />
                <circle cx="200" cy="100" r="5" fill="#e4483c" />
                <circle cx="176" cy="196" r="4" fill="#2b9df0" />
                <circle cx="84" cy="30" r="3" fill="#ffc21f" />
                <circle cx="22" cy="84" r="3" fill="#2b9df0" />
                <circle cx="216" cy="140" r="3" fill="#ffc21f" />
                <circle cx="114" cy="228" r="4" fill="#09090c" />
                <circle cx="212" cy="60" r="3" fill="#09090c" />
                <circle cx="38" cy="150" r="3" fill="#09090c" />
                <rect x="64" y="44" width="8" height="4" rx="2" fill="#2f5cff" transform="rotate(30 64 44)" />
                <rect x="190" y="164" width="9" height="4" rx="2" fill="#e4483c" transform="rotate(-40 190 164)" />
                <rect x="94" y="208" width="8" height="4" rx="2" fill="#ffc21f" transform="rotate(20 94 208)" />
                <rect x="204" y="196" width="8" height="4" rx="2" fill="#2f5cff" transform="rotate(50 204 196)" />
                <rect x="128" y="22" width="8" height="4" rx="2" fill="#09090c" transform="rotate(-20 128 22)" />
                <rect x="26" y="190" width="8" height="4" rx="2" fill="#e4483c" transform="rotate(35 26 190)" />
            </g>
            <ellipse cx="122" cy="128" rx="76" ry="80" fill="#083a7a" />
            <ellipse cx="122" cy="122" rx="76" ry="80" fill="url(#tG)" />
            <ellipse cx="122" cy="122" rx="70" ry="74" fill="none" stroke="#d6efff" strokeOpacity="0.55" strokeWidth="2" />
            <g fill="#09090c" opacity="0.65">
                <circle cx="72" cy="92" r="2.5" />
                <circle cx="98" cy="62" r="2" />
                <circle cx="164" cy="72" r="2.5" />
                <circle cx="180" cy="132" r="2" />
                <circle cx="154" cy="184" r="2.5" />
                <circle cx="84" cy="180" r="2" />
                <circle cx="64" cy="140" r="2.5" />
            </g>
            <ellipse cx="122" cy="128" rx="50" ry="54" fill="#05285e" />
            <ellipse cx="122" cy="122" rx="50" ry="54" fill="#0b3a86" stroke="url(#tBl)" strokeWidth="13" />
            <ellipse cx="122" cy="122" rx="56" ry="60" fill="none" stroke="#ffe9a0" strokeOpacity="0.7" strokeWidth="1.5" />
            <g filter="url(#tF)">
                <path d="M122 82 L132 108.25 L160.04 109.64 L138.17 127.25 L145.51 154.36 L122 139 L98.49 154.36 L105.83 127.25 L83.96 109.64 L112.01 108.25 Z" fill="#ffc21f" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                <path d="M122 122 L122 82 L132 108.25 L160.04 109.64 L138.17 127.25 L145.51 154.36 L122 139 Z" fill="#c98a00" opacity="0.4" />
                <path d="M112.01 108.25 L122 82 L132 108.25 Z" fill="#fff4b8" opacity="0.8" />
            </g>
            <path d="M40 60 C60 24 110 10 150 16" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="6" strokeLinecap="round" />
        </svg>
    );
}

export function GiftCoin({ style, className, scale = 1 }: P) {
    return (
        <svg
            style={{ transform: "rotate(8deg)", filter: "drop-shadow(0 18px 16px rgba(10,20,90,0.3))", ...style }}
            width={156 * scale}
            height={178 * scale}
            viewBox="0 0 156 178"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="dS" gradientUnits="userSpaceOnUse" x1="12" y1="0" x2="140" y2="0">
                    <stop offset="0" stopColor="#20232f" />
                    <stop offset="0.35" stopColor="#7c8194" />
                    <stop offset="1" stopColor="#1a1c26" />
                </linearGradient>
                <radialGradient id="dT" cx="32%" cy="24%" r="92%">
                    <stop offset="0" stopColor="#e6e9f2" />
                    <stop offset="0.5" stopColor="#7a7f92" />
                    <stop offset="1" stopColor="#2a2d3b" />
                </radialGradient>
                <linearGradient id="dG" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="1" stopColor="#c6cbe6" />
                </linearGradient>
            </defs>
            <ellipse cx="76" cy="94" rx="64" ry="68" fill="url(#dS)" />
            <rect x="12" y="78" width="128" height="16" fill="url(#dS)" />
            <ellipse cx="76" cy="78" rx="64" ry="68" fill="url(#dT)" />
            <ellipse cx="76" cy="78" rx="57" ry="61" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2.5" />
            <ellipse cx="76" cy="78" rx="46" ry="50" fill="none" stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 5" />
            <ellipse cx="76" cy="124" rx="34" ry="7" fill="#0d0f18" opacity="0.4" />
            <rect x="46" y="86" width="60" height="38" rx="4" fill="#9aa0ba" />
            <rect x="46" y="84" width="60" height="36" rx="4" fill="url(#dG)" />
            <rect x="40" y="70" width="72" height="16" rx="4" fill="#ffffff" stroke="#b9bfd8" strokeWidth="1.5" />
            <rect x="71" y="70" width="10" height="50" fill="#f5b83a" />
            <path d="M76 70 C60 40 40 58 66 70 Z" fill="#ffffff" stroke="#b9bfd8" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M76 70 C92 40 112 58 86 70 Z" fill="#ffffff" stroke="#b9bfd8" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="76" cy="69" r="5" fill="#f5b83a" stroke="#c98d10" strokeWidth="1.5" />
            <path d="M26 44 C40 20 80 10 108 20" fill="none" stroke="#ffffff" strokeOpacity="0.65" strokeWidth="5" strokeLinecap="round" />
        </svg>
    );
}

export function Blobs({ style, className, scale = 1 }: P) {
    return (
        <svg style={{ ...style }} width={176 * scale} height={150 * scale} viewBox="0 0 176 150" className={className}
            aria-hidden="true">
            <defs>
                <linearGradient id="nB" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#25277c" />
                    <stop offset="1" stopColor="#0a0a30" />
                </linearGradient>
                <linearGradient id="yB" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ffe45c" />
                    <stop offset="1" stopColor="#f2b800" />
                </linearGradient>
            </defs>
            <ellipse cx="90" cy="82" rx="76" ry="58" fill="url(#nB)" transform="rotate(-16 90 82)" />
            <path d="M14 46 C36 8 104 0 152 40 C126 34 66 40 14 80z" fill="url(#yB)" />
        </svg>
    );
}

export function Torus({ style, className, scale = 1 }: P) {
    return (
        <svg
            style={{ filter: "drop-shadow(0 8px 6px rgba(10,20,90,0.25))", ...style }}
            width={68 * scale}
            height={68 * scale}
            viewBox="0 0 68 68"
            className={className}
            aria-hidden="true"
        >
            <circle cx="34" cy="38" r="23" fill="none" stroke="#7d84b8" strokeWidth="12" />
            <circle cx="34" cy="34" r="23" fill="none" stroke="#f3f4fb" strokeWidth="12" />
            <circle cx="34" cy="34" r="23" fill="none" stroke="#1f9a2b" strokeWidth="12" strokeDasharray="52 100" />
            <circle cx="34" cy="34" r="27" fill="none" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" strokeDasharray="30 140" transform="rotate(200 34 34)" />
        </svg>
    );
}

export function RpCoin({ style, className, scale = 1 }: P) {
    return (
        <svg
            style={{ transform: "rotate(-6deg)", filter: "drop-shadow(0 22px 18px rgba(10,20,90,0.36))", ...style }}
            width={192 * scale}
            height={190 * scale}
            viewBox="0 0 192 190"
            className={className}
            aria-hidden="true"
        >
            <defs>
                <linearGradient id="rS" gradientUnits="userSpaceOnUse" x1="14" y1="0" x2="170" y2="0">
                    <stop offset="0" stopColor="#171a45" />
                    <stop offset="0.35" stopColor="#5763a3" />
                    <stop offset="1" stopColor="#12153a" />
                </linearGradient>
                <radialGradient id="rT" cx="32%" cy="24%" r="92%">
                    <stop offset="0" stopColor="#b4bff0" />
                    <stop offset="0.5" stopColor="#4f5b98" />
                    <stop offset="1" stopColor="#1b204f" />
                </radialGradient>
            </defs>
            <ellipse cx="92" cy="102" rx="78" ry="72" fill="url(#rS)" />
            <rect x="14" y="84" width="156" height="18" fill="url(#rS)" />
            <ellipse cx="92" cy="84" rx="78" ry="72" fill="url(#rT)" />
            <ellipse cx="92" cy="84" rx="71" ry="65" fill="none" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="2.5" />
            <ellipse cx="92" cy="84" rx="66" ry="60" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="3" strokeDasharray="3 6" />
            <ellipse cx="92" cy="86" rx="54" ry="49" fill="#141842" opacity="0.35" />
            <ellipse cx="92" cy="84" rx="54" ry="49" fill="none" stroke="#ffffff" strokeOpacity="0.2" strokeWidth="3" />
            <text x="94" y="108" textAnchor="middle" fontFamily="Hanken Grotesk, sans-serif" fontWeight="800" fontSize="62" fill="#0d1036">
                Rp
            </text>
            <text x="92" y="104" textAnchor="middle" fontFamily="Hanken Grotesk, sans-serif" fontWeight="800" fontSize="62" fill="#e8ebff">
                Rp
            </text>
            <path d="M32 50 C46 26 86 14 116 22" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" />
        </svg>
    );
}