"use client";

import { useCallback, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

type ConfirmOptions = { confirmLabel?: string; cancelLabel?: string; tone?: "default" | "danger" };
type ConfirmState = ConfirmOptions & { message: string };

// Pengganti window.confirm() yang async (promise), biar pemanggilnya tetap
// bisa nulis "if (!(await confirm(...))) return;" persis gaya window.confirm
// lama -- cuma beda dialognya sekarang komponen sendiri, bukan popup browser.
export function useConfirm() {
    const [state, setState] = useState<ConfirmState | null>(null);
    const resolver = useRef<((v: boolean) => void) | undefined>(undefined);

    const confirm = useCallback((message: string, opts?: ConfirmOptions) => {
        setState({ message, ...opts });
        return new Promise<boolean>((resolve) => {
            resolver.current = resolve;
        });
    }, []);

    function settle(v: boolean) {
        setState(null);
        resolver.current?.(v);
    }

    const dialog = state ? (
        <ConfirmDialog
            message={state.message}
            confirmLabel={state.confirmLabel ?? "Ya, lanjutkan"}
            cancelLabel={state.cancelLabel ?? "Batal"}
            tone={state.tone}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
        />
    ) : null;

    return { confirm, dialog };
}
