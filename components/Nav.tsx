"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// "Daftar" SENGAJA bukan bagian dari daftar ini lagi -- sekarang jadi tombol
// CTA terpisah di sebelah nav ini (lihat Hero.tsx & FloatingNav.tsx), gaya
// "nav link di tengah + tombol CTA sendiri" ala landing page agency, bukan
// digabung satu pill kayak sebelumnya.
// Diekspor supaya menu hamburger mobile (Hero.tsx) bisa pakai daftar link yang
// sama persis, bukan nyalin ulang -- satu sumber kebenaran buat isi nav.
export const NAV_ITEMS = [
  { href: "#smm", label: "SMM Panel", id: "smm" },
  { href: "#produk", label: "Paket Stars", id: "produk" },
  { href: "#harga", label: "Harga", id: "harga" },
  { href: "#bantuan", label: "Bantuan", id: "bantuan" },
];
const ITEMS = NAV_ITEMS;

export default function Nav() {
  // -1 = belum ada section yang aktif (posisi di paling atas halaman) --
  // beda dari sebelumnya yang selalu ada 1 item "Daftar" nyala sebagai default.
  const [active, setActive] = useState(-1);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const lockUntil = useRef(0);

  const measure = useCallback(() => {
    if (active < 0) {
      setInd(null);
      return;
    }
    const el = refs.current[active];
    if (el) setInd({ x: el.offsetLeft, w: el.offsetWidth });
  }, [active]);

  useLayoutEffect(measure, [measure]);

  // ukur ulang setelah font selesai dimuat / ukuran berubah
  useEffect(() => {
    document.fonts?.ready.then(measure);
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  // indikator ikut bergeser sesuai bagian yang sedang dilihat
  useEffect(() => {
    const onScroll = () => {
      if (Date.now() < lockUntil.current) return;
      const vh = window.innerHeight;
      if (window.scrollY < vh * 0.5) return setActive(-1);
      let cur = -1;
      ITEMS.forEach((it, i) => {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top <= vh * 0.4) cur = i;
      });
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className="nav" aria-label="Navigasi utama">
      <span
        className="nav-ind"
        aria-hidden="true"
        style={ind ? { width: ind.w, transform: `translateX(${ind.x}px)`, opacity: 1 } : undefined}
      />
      {ITEMS.map((it, i) => (
        <a
          key={it.label}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`nav-link ${active === i ? "on" : ""}`}
          href={it.href}
          aria-current={active === i ? "true" : undefined}
          onClick={() => {
            setActive(i);
            lockUntil.current = Date.now() + 1000;
          }}
        >
          {it.label}
        </a>
      ))}
      {/* Rute halaman sungguhan (bukan anchor section di halaman ini), jadi
          sengaja di luar ITEMS/scroll-spy di atas -- nggak ada status "aktif"
          yang perlu dilacak lewat scroll. */}
      <a className="nav-link" href="/blog">
        Blog
      </a>
    </nav>
  );
}
