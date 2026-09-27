import type { Metadata, Viewport } from "next";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/hanken-grotesk/800.css";
import "./globals.css";
import "./sections.css";

export const metadata: Metadata = {
  title: "Digora — Beli Telegram Stars Murah & Cepat",
  description:
    "Beli Telegram Stars untuk dirimu atau teman dengan harga terjangkau. Proses otomatis 24 jam, langsung masuk ke akun.",
};

// maximumScale + userScalable:false ngunci pinch-zoom & double-tap-zoom di
// HP (Android & iOS) — tanpa ini, browser HP ngizinin orang zoom in/out dan
// geser-geser layar bebas, jadi kerasa "goyang"/gak stabil kayak web biasa
// alih-alih kerasa kayak aplikasi.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}