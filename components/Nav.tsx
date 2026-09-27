"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const ITEMS = [
  { href: "#produk", label: "Paket", id: "produk" },
  { href: "#harga", label: "Harga", id: "harga" },
  { href: "#bantuan", label: "Bantuan", id: "bantuan" },
  { href: "/daftar", label: "Beli Stars", id: "" },
];
const HOME = ITEMS.length - 1; // "Beli Stars" aktif saat berada di paling atas

export default function Nav() {
  const [active, setActive] = useState(HOME);
  const [ind, setInd] = useState<{ x: number; w: number } | null>(null);
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const lockUntil = useRef(0);

  const measure = useCallback(() => {
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
      if (window.scrollY < vh * 0.5) return setActive(HOME);
      let cur = 0;
      ITEMS.forEach((it, i) => {
        if (!it.id) return;
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
    </nav>
  );
}