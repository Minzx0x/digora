import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";

// Next.js otomatis mendeteksi file ini (konvensi App Router) dan nyambungin
// meta tag og:image/twitter:image yang sesuai — nggak perlu diset manual di
// metadata layout.tsx. Dipakai pas link Digora di-share di WhatsApp/Telegram/
// dll, biar preview-nya kelihatan brand-nya, bukan kotak kosong.
export const alt = "Digora — Telegram Stars, Premium & SMM Panel";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
    // Satori (dipakai ImageResponse) nggak bisa resolve URL relatif "/icon.png"
    // -- dibaca langsung dari file & di-encode base64 jadi data URI.
    const iconBuf = await readFile(path.join(process.cwd(), "app/icon.png"));
    const iconSrc = `data:image/png;base64,${iconBuf.toString("base64")}`;

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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={iconSrc} width={92} height={92} style={{ borderRadius: 22 }} />
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
