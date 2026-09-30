"use client";

import { useEffect, useState } from "react";
import Nav from "./Nav";

// Menu melayang di atas layar setelah hero terlewat, supaya penanda hitam
// yang bergeser (Paket / Harga / Bantuan) tetap terlihat saat halaman di-scroll.
export default function FloatingNav() {
    const [show, setShow] = useState(false);
    const [z, setZ] = useState(1);

    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.6);
        const onResize = () => setZ(Math.max(1, window.innerWidth / 1600));
        onScroll();
        onResize();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
        };
    }, []);

    return (
        <div className={`nav-float ${show ? "show" : ""}`} style={{ zoom: z }} inert={!show} aria-hidden={!show}>
            <Nav />
            <a className="btn-dark nav-float-cta" href="/daftar">
                Daftar
            </a>
        </div>
    );
}