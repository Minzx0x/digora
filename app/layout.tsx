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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}