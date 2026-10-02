"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordPageView } from "@/lib/actions/analytics";

// Dipasang sekali di app/layout.tsx (RootLayout), jadi otomatis ikut di
// SEMUA halaman -- nggak perlu dipasang manual satu-satu. Nyatet ulang tiap
// kali path berubah (termasuk navigasi client-side antar halaman, bukan
// cuma full page load pertama).
export default function PageViewTracker() {
    const pathname = usePathname();

    useEffect(() => {
        recordPageView(pathname);
    }, [pathname]);

    return null;
}
