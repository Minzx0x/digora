"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import { signOutAction } from "@/lib/actions/auth";

const I = {
    home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    bag: "M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0",
    tag: "M3 12V4h8l10 10-8 8zM7.5 8.5h.01",
    trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
    chart: "M4 20V10M10 20V4M16 20v-7M20 20H4",
    users: "M16 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M21 20v-1a4 4 0 0 0-3-3.9M15 4.2a3.5 3.5 0 0 1 0 6.6",
    card: "M3 6h18v12H3zM3 10h18",
    chat: "M4 4h16v11H8l-4 4z",
    gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12l2-1-2-4-2 .5-1.5-1L15 4H9l-.5 2.5-1.5 1L5 7l-2 4 2 1v1l-2 1 2 4 2-.5 1.5 1L9 20h6l.5-2.5 1.5-1 2 .5 2-4-2-1z",
    out: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9",
};

function Ico({ d }: { d: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

export type AdminSection = "ringkasan" | "statistik" | "pesanan" | "paket" | "smm" | "pelanggan" | "pembayaran" | "tiket" | "pengaturan";

// Sidebar admin dipakai bareng di semua halaman /admin/* supaya navigasinya
// konsisten. "active" menandai menu mana yang sedang dibuka (bold + latar hitam).
export default function AdminSidebar({ active }: { active: AdminSection }) {
    const router = useRouter();
    // Di HP, sidebar ini jadi drawer yang nutup default (sama kayak dashboard
    // pelanggan) — dibuka lewat tombol bulat ngambang di pojok kiri-bawah,
    // biar konten halaman admin (tabel, form, dst) dapet jatah lebar penuh.
    const [open, setOpen] = useState(false);

    // Link (bukan <a> biasa) supaya pindah antar halaman admin berasa instan —
    // klik-nya jadi client-side navigation + langsung dikasih skeleton loading.tsx,
    // gak perlu reload seluruh halaman dari server kayak <a> biasa.
    //
    // SENGAJA TIDAK pakai prefetch={true} eksplisit: itu bikin Next.js langsung
    // render ULANG SEMUA halaman admin (Pesanan, Pelanggan, Pembayaran, dst) di
    // background begitu sidebar ini muncul — lima query Supabase sekaligus tiap
    // buka /admin, dan sempat kejadian bikin error acak "could not finish this
    // Suspense boundary" di console (race antar render yang jalan bebarengan).
    // Tanpa prop ini, Next pakai default-nya: cuma prefetch skeleton/shell-nya
    // (ringan), data asli baru diambil pas menu itu benar-benar diklik — nav
    // tetap berasa cepat (skeleton-nya sudah siap) tanpa nembak 5 query sekaligus.
    const link = (section: AdminSection, href: string, icon: string, label: string) => (
        <Link className={`d-link ${active === section ? "on" : ""}`} href={href} title={label} onClick={() => setOpen(false)}>
            <Ico d={icon} />
            <span className="d-link-label">{label}</span>
        </Link>
    );

    return (
        <>
            {!open && (
                <button type="button" className="d-menu-btn-fixed" aria-label="Buka menu" onClick={() => setOpen(true)}>
                    <Ico d="M4 7h16M4 12h16M4 17h16" />
                </button>
            )}

            <div className={`d-side-backdrop ${open ? "show" : ""}`} onClick={() => setOpen(false)} aria-hidden="true" />

            <aside className={`d-side ${open ? "open" : ""}`}>
                <div className="d-brand">
                    <Brand themed />
                    <ThemeToggle />
                </div>

                <button type="button" className="d-side-close" aria-label="Tutup menu" onClick={() => setOpen(false)}>
                    <Ico d="M6 6l12 12M18 6L6 18" />
                </button>

                <nav className="d-nav" aria-label="Menu dashboard">
                    {link("ringkasan", "/admin", I.home, "Ringkasan")}
                    {link("statistik", "/admin/statistik", I.chart, "Statistik")}
                    {link("pesanan", "/admin/pesanan", I.bag, "Pesanan")}
                    {link("paket", "/admin/paket", I.tag, "Paket & Harga")}
                    {link("smm", "/admin/smm", I.trend, "SMM Panel")}
                    {link("pelanggan", "/admin/pelanggan", I.users, "Pelanggan")}
                    {link("pembayaran", "/admin/pembayaran", I.card, "Pembayaran")}
                    {link("tiket", "/admin/tiket", I.chat, "Tiket Support")}
                    {link("pengaturan", "/admin/pengaturan", I.gear, "Pengaturan")}
                    <a
                        className="d-link"
                        href="/admin/login"
                        title="Keluar"
                        onClick={async (e) => {
                            e.preventDefault();
                            await signOutAction();
                            router.push("/admin/login");
                            router.refresh();
                        }}
                    >
                        <Ico d={I.out} />
                        <span className="d-link-label">Keluar</span>
                    </a>
                </nav>
            </aside>
        </>
    );
}