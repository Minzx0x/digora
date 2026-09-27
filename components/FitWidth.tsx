"use client";

import { useLayoutEffect, useState } from "react";

// Saat browser di-zoom out (viewport sangat lebar), bagian bawah landing page ikut
// diperbesar proporsional, supaya tampilannya konsisten dengan hero dan tidak jadi
// kolom kecil di tengah dengan sisi kosong. Di layar biasa (<= 1600px) tidak berubah.
const BASE = 1600;

export default function FitWidth({ children }: { children: React.ReactNode }) {
    const [z, setZ] = useState(1);

    useLayoutEffect(() => {
        const update = () => setZ(Math.max(1, window.innerWidth / BASE));
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    return <div style={{ zoom: z }}>{children}</div>;
}