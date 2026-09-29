import { ImageResponse } from "next/og";

// Next.js otomatis mendeteksi file ini (konvensi App Router) dan nyambungin
// meta tag og:image/twitter:image yang sesuai — nggak perlu diset manual di
// metadata layout.tsx. Dipakai pas link Digora di-share di WhatsApp/Telegram/
// dll, biar preview-nya kelihatan brand-nya, bukan kotak kosong.
export const alt = "Digora — Telegram Stars, Premium & SMM Panel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(160deg, #2540ff, #1a2fd0)",
                    color: "#ffffff",
                    fontFamily: "sans-serif",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
                    <svg width="76" height="76" viewBox="0 0 24 24">
                        <path d="M12 2 L22 9 L12 22 L2 9 Z" fill="#ffffff" />
                        <path
                            d="M2 9 H22 M8 9 L12 2 L16 9 M8 9 L12 22 L16 9"
                            fill="none"
                            stroke="#2540ff"
                            strokeWidth="1.4"
                        />
                    </svg>
                    <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: "-3px" }}>Digora</div>
                </div>
                <div style={{ marginTop: 30, fontSize: 34, fontWeight: 500, opacity: 0.92 }}>
                    Telegram Stars, Premium &amp; SMM Panel
                </div>
            </div>
        ),
        { ...size },
    );
}
