"use client";

import { useEffect } from "react";

// Notifikasi yang ngambang di atas viewport (position: fixed), BUKAN pesan
// inline di dalam kartu — biar kelihatan berapa pun posisi scroll-nya,
// alih-alih ketimpa/ke-skip kalau posisinya lagi di bagian lain halaman.
// Auto-hilang sendiri setelah beberapa detik. kind="error" dipakai buat
// ganti window.alert() (dialog bawaan browser yang keluar dari desain sama
// sekali) di seluruh halaman admin/dashboard.
export default function Toast({
    message,
    kind = "success",
    onDone,
}: {
    message: string;
    kind?: "success" | "error";
    onDone: () => void;
}) {
    useEffect(() => {
        const t = setTimeout(onDone, 4500);
        return () => clearTimeout(t);
    }, [onDone]);

    return (
        <div className={`u-toast${kind === "error" ? " u-toast-error" : ""}`} role="status">
            {kind === "error" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8v5" />
                    <path d="M12 16.5v.01" />
                </svg>
            ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                </svg>
            )}
            <span>{message}</span>
            <button type="button" className="u-toast-close" aria-label="Tutup" onClick={onDone}>
                ✕
            </button>
        </div>
    );
}
