import type { Metadata, Viewport } from "next";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/hanken-grotesk/600.css";
import "@fontsource/hanken-grotesk/700.css";
import "@fontsource/hanken-grotesk/800.css";
import "./globals.css";
import "./sections.css";

const TITLE = "Digora — Telegram Stars & SMM Panel Termurah";
const DESCRIPTION =
  "Top up Telegram Stars/Premium & SMM Panel (followers, likes, views) untuk IG, TikTok, YouTube — harga termurah, proses otomatis 24 jam, langsung masuk.";

export const metadata: Metadata = {
  // Dibutuhkan Next.js buat nge-resolve URL gambar OG (app/opengraph-image.tsx)
  // jadi URL absolut yang bener pas di-share — tanpa ini linknya relatif dan
  // nggak kebaca sama WhatsApp/Telegram pas nampilin preview.
  metadataBase: new URL("https://www.digora.codes"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Digora",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
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

// Cegah "kedip" tema salah pas reload di /dashboard & /admin: baca localStorage
// SEBELUM React hydrate, langsung setAttribute ke <html> (bukan lewat effect,
// yang baru jalan setelah render pertama — kelihatan kedip). Aman dijalankan
// di semua halaman (termasuk landing page) karena globals.css/sections.css
// sama sekali tidak baca data-theme, jadi atribut ini nggak ngefek di situ.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('digora-theme');
    if (t !== 'light' && t !== 'dark') {
      t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: script anti-flash di bawah nyetel data-theme
    // di elemen ini secara imperatif SEBELUM React hydrate — tanpa prop ini,
    // React ngebandingin atribut itu ke HTML dari server (yang belum punya
    // data-theme sama sekali) dan nganggepnya mismatch, walau ini disengaja.
    <html lang="id" suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}