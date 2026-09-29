"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Brand from "./Brand";
import ThemeToggle from "./ThemeToggle";
import { signOutAction } from "@/lib/actions/auth";

const I = {
    home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    star: "M12 2l3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z",
    trend: "M3 17l6-6 4 4 8-8M15 7h6v6",
    bag: "M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0",
    user: "M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2M16 14.5h.01",
    help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01",
    chat: "M4 4h16v11H8l-4 4z",
    list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    out: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9",
};

function Ico({ d }: { d: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

export type DashboardSection = "beranda" | "saldo" | "stars" | "smm" | "daftar-layanan" | "riwayat" | "tiket" | "profil" | "bantuan";

// Sidebar dashboard pelanggan dipakai bareng di semua halaman /dashboard/* —
// sama pola-nya dengan AdminSidebar buat /admin/*, supaya navigasi jadi route
// asli (Link, bisa di-back/forward/bookmark) bukan hash (#beranda dkk) yang
// cuma nge-switch tab di client tanpa beneran pindah halaman.
export default function DashboardSidebar({ active }: { active: DashboardSection }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const link = (section: DashboardSection, href: string, icon: string, label: string) => (
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

                <nav className="d-nav" aria-label="Menu akun">
                    {link("beranda", "/dashboard/beranda", I.home, "Beranda")}
                    {link("saldo", "/dashboard/saldo", I.wallet, "Isi Saldo")}
                    {link("stars", "/dashboard/stars", I.star, "Stars & Premium")}
                    {link("smm", "/dashboard/smm", I.trend, "SMM Panel")}
                    {link("daftar-layanan", "/dashboard/daftar-layanan", I.list, "Daftar Layanan")}
                    {link("riwayat", "/dashboard/riwayat", I.bag, "Pesanan saya")}
                    {link("tiket", "/dashboard/tiket", I.chat, "Tiket")}
                    {link("profil", "/dashboard/profil", I.user, "Profil")}
                    {link("bantuan", "/dashboard/bantuan", I.help, "Bantuan")}
                    <a
                        className="d-link"
                        href="/login"
                        title="Keluar"
                        onClick={async (e) => {
                            e.preventDefault();
                            await signOutAction();
                            router.push("/login");
                            router.refresh();
                        }}
                    >
                        <Ico d={I.out} />
                        <span className="d-link-label">Keluar</span>
                    </a>
                </nav>

                <div className="d-side-foot">
                    <b>Butuh bantuan?</b>
                    Ada kendala dengan pesananmu? Hubungi admin Digora.
                    <br />
                    <a href="https://t.me/Digoracs" target="_blank" rel="noopener noreferrer">
                        Chat admin
                    </a>
                </div>
            </aside>
        </>
    );
}