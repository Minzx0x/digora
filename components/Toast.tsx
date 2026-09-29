"use client";

import { useEffect } from "react";

// Notifikasi sukses yang ngambang di atas viewport (position: fixed), BUKAN
// pesan inline di dalam kartu — biar kelihatan berapa pun posisi scroll-nya
// pas order berhasil, alih-alih ketimpa/ke-skip kalau posisinya lagi di
// bagian lain halaman. Auto-hilang sendiri setelah beberapa detik.
export default function Toast({ message, onDone }: { message: string; onDone: () => void }) {
    useEffect(() => {
        const t = setTimeout(onDone, 4500);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div className="u-toast" role="status">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>{message}</span>
            <button type="button" className="u-toast-close" aria-label="Tutup" onClick={onDone}>
                ✕
            </button>
        </div>
    );
}
