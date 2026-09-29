"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "digora-theme";

function Ico({ d }: { d: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

const SUN = "M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8";
const MOON = "M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5";

// Tombol ganti tema — script anti-flash di app/layout.tsx sudah nyetel
// data-theme di <html> SEBELUM komponen ini mount, jadi di sini tinggal baca
// nilainya buat nampilin ikon yang benar, lalu toggle + simpan pilihan pas
// diklik. Dipakai bareng di AdminSidebar & DashboardSidebar (bukan diduplikat)
// soalnya logic-nya identik di kedua tempat.
export default function ThemeToggle() {
    const [theme, setTheme] = useState<"light" | "dark" | null>(null);

    useEffect(() => {
        const current = document.documentElement.getAttribute("data-theme");
        setTheme(current === "dark" ? "dark" : "light");
    }, []);

    function toggle() {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        document.documentElement.setAttribute("data-theme", next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // localStorage bisa gagal (mode private dll) — tema tetap berlaku
            // buat sesi ini, cuma nggak keinget pas reload.
        }
    }

    if (theme === null) return <span className="d-theme-toggle" aria-hidden="true" />;

    return (
        <button
            type="button"
            className="d-theme-toggle"
            onClick={toggle}
            aria-label={theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
            title={theme === "dark" ? "Mode terang" : "Mode gelap"}
        >
            <Ico d={theme === "dark" ? SUN : MOON} />
        </button>
    );
}
