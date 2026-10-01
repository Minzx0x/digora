"use client";

// Pengganti window.confirm() (popup bawaan browser, keluar dari desain sama
// sekali) -- dirender lewat hook useConfirm() di file sebelah, bukan dipakai
// langsung sebagai komponen berdiri sendiri.
export default function ConfirmDialog({
    message,
    confirmLabel,
    cancelLabel,
    tone = "default",
    onConfirm,
    onCancel,
}: {
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    tone?: "default" | "danger";
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="u-confirm-backdrop" role="presentation" onClick={onCancel}>
            <div className="u-confirm" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <p>{message}</p>
                <div className="u-confirm-actions">
                    <button type="button" className="d-pill" onClick={onCancel}>
                        {cancelLabel}
                    </button>
                    <button type="button" className={`d-btn${tone === "danger" ? " u-confirm-danger" : ""}`} onClick={onConfirm}>
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
