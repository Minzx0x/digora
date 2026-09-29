"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createDepositAction, getDepositStatusAction, cancelDepositAction, type MutasiRow, type PendingDepositRow } from "@/lib/actions/data";
import { StarCoin } from "./Coins";

const PAY_ICON: Record<string, string> = {
    qris: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v6h-4M14 18h2v2h-2z",
    ewallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2M16 14.5h.01",
    bank: "M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18",
};

const DEPOSIT_PRESETS = [10000, 25000, 50000, 100000, 250000, 500000];
const MIN_DEPOSIT = 10000;

const PAY = [
    { id: "qris", label: "QRIS", note: "Semua e-wallet & m-banking" },
    { id: "ewallet", label: "E-wallet", note: "DANA, OVO, GoPay, ShopeePay" },
    { id: "bank", label: "Transfer bank", note: "BCA, BNI, BRI, Mandiri" },
] as const;

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");

function Ico({ d }: { d: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

export default function SaldoView({
    saldo,
    mutasi,
    pendingDeposit,
}: {
    saldo: number;
    mutasi: MutasiRow[];
    pendingDeposit: PendingDepositRow | null;
}) {
    const router = useRouter();
    const [depAmount, setDepAmount] = useState(50000);
    const [depCustom, setDepCustom] = useState("");
    const [depPay, setDepPay] = useState<"qris" | "ewallet" | "bank">("qris");
    const [depMsg, setDepMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const [depositing, setDepositing] = useState(false);
    const [pendingDep, setPendingDep] = useState<{ referenceId: string; payUrl: string; qrDataUrl: string; amount: number } | null>(
        null,
    );
    const depPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const depSyncedRef = useRef<string | null>(null);

    function stopDepositPolling() {
        if (depPollRef.current) {
            clearInterval(depPollRef.current);
            depPollRef.current = null;
        }
    }

    useEffect(() => stopDepositPolling, []);

    // Restore tagihan yang masih 'pending' dari server — dipanggil pas komponen
    // pertama kali dimuat (termasuk sesudah user nge-refresh halaman di tengah
    // proses bayar). Tanpa ini, kartu QR/status pembayaran hilang begitu
    // halaman di-refresh walau tagihannya di database masih aktif nunggu dibayar.
    useEffect(() => {
        const pd = pendingDeposit;
        if (!pd) {
            depSyncedRef.current = null;
            stopDepositPolling();
            setPendingDep(null);
            return;
        }
        if (depSyncedRef.current === pd.referenceId) return;
        depSyncedRef.current = pd.referenceId;
        let cancelled = false;
        (async () => {
            const qrDataUrl = pd.qrString ? await QRCode.toDataURL(pd.qrString, { margin: 1, width: 220 }).catch(() => "") : "";
            if (cancelled) return;
            setPendingDep({ referenceId: pd.referenceId, payUrl: pd.payUrl, qrDataUrl, amount: pd.amount });
            startDepositPolling(pd.referenceId);
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingDeposit?.referenceId]);

    function startDepositPolling(referenceId: string) {
        stopDepositPolling();
        depPollRef.current = setInterval(async () => {
            const res = await getDepositStatusAction(referenceId);
            if (res.error) return;
            if (res.status === "paid") {
                stopDepositPolling();
                setPendingDep(null);
                setDepMsg({ ok: true, t: `Saldo ${rp(res.amount ?? 0)} berhasil masuk.` });
                router.refresh();
            } else if (res.status === "failed" || res.status === "expired") {
                stopDepositPolling();
                setPendingDep(null);
                setDepMsg({ ok: false, t: "Pembayaran gagal atau kedaluwarsa. Silakan buat tagihan baru." });
            }
        }, 4000);
    }

    const depValue = depCustom ? Number(depCustom) : depAmount;
    const depFee = depPay === "qris" ? Math.round(depValue * 0.007) + 200 : depPay === "ewallet" ? 1500 : 3000;

    async function deposit(e: React.FormEvent) {
        e.preventDefault();
        if (!Number.isFinite(depValue) || depValue < MIN_DEPOSIT) {
            setDepMsg({ ok: false, t: `Minimal isi saldo ${rp(MIN_DEPOSIT)}.` });
            return;
        }
        const amount = depValue;
        setDepositing(true);
        setDepMsg(null);
        setPendingDep(null);
        stopDepositPolling();

        const res = await createDepositAction({ amount, method: depPay });
        setDepositing(false);

        if (res.error) {
            setDepMsg({ ok: false, t: res.error });
            return;
        }

        const qrDataUrl = res.qrString ? await QRCode.toDataURL(res.qrString, { margin: 1, width: 220 }).catch(() => "") : "";
        depSyncedRef.current = res.referenceId!;
        setPendingDep({ referenceId: res.referenceId!, payUrl: res.payUrl ?? "", qrDataUrl, amount });
        startDepositPolling(res.referenceId!);
    }

    async function cancelDeposit() {
        if (!pendingDep) return;
        stopDepositPolling();
        const referenceId = pendingDep.referenceId;
        setPendingDep(null);
        setDepMsg(null);
        await cancelDepositAction(referenceId);
    }

    return (
        <>
            {pendingDep ? (
                <div className="s-grid">
                    <section className="d-card s-pay-wait">
                        <div className="s-pay-wait-head">
                            <span className="s-pay-spin" aria-hidden="true" />
                            <div>
                                <h2>Menunggu pembayaran</h2>
                                <p className="d-note">
                                    Halaman ini otomatis update begitu Paymenku konfirmasi pembayaran kamu.
                                </p>
                            </div>
                        </div>

                        {pendingDep.qrDataUrl && (
                            <div className="s-qr-box">
                                <img src={pendingDep.qrDataUrl} alt="QR pembayaran QRIS" width={220} height={220} />
                                <span className="d-note">Scan pakai aplikasi e-wallet atau m-banking mana saja</span>
                            </div>
                        )}

                        {pendingDep.payUrl && (
                            <a className="d-btn u-go" href={pendingDep.payUrl} target="_blank" rel="noreferrer">
                                Buka halaman pembayaran →
                            </a>
                        )}

                        <button type="button" className="s-pay-cancel" onClick={cancelDeposit}>
                            Batalkan tagihan ini
                        </button>
                    </section>

                    <aside className="s-right">
                        <div className="d-balance s-balance-sm">
                            <div className="d-balance-art" aria-hidden="true">
                                <StarCoin scale={0.5} className="float-slow" />
                            </div>
                            <div className="d-balance-inner">
                                <small>Saldo kamu</small>
                                <strong>{rp(saldo)}</strong>
                            </div>
                        </div>

                        <div className="d-card s-sum">
                            <h2>Ringkasan</h2>
                            <div className="u-row">
                                <span>Saldo masuk</span>
                                <b>{rp(pendingDep.amount)}</b>
                            </div>
                            <div className="u-row">
                                <span>Kode tagihan</span>
                                <b className="s-ref-code">{pendingDep.referenceId}</b>
                            </div>
                            <p className="d-note d-note-mt">
                                Saldo masuk otomatis setelah pembayaran terkonfirmasi.
                            </p>
                        </div>
                    </aside>
                </div>
            ) : (
                <div className="s-grid">
                    <section className="d-card s-form">
                        <form className="u-form" onSubmit={deposit} noValidate>
                            <div>
                                <div className="s-step">
                                    <i>1</i>Pilih nominal
                                </div>
                                <div className="s-amounts" role="radiogroup" aria-label="Nominal">
                                    {DEPOSIT_PRESETS.map((v) => {
                                        const on = !depCustom && depAmount === v;
                                        return (
                                            <button
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                key={v}
                                                className={`s-amt ${on ? "on" : ""}`}
                                                onClick={() => {
                                                    setDepAmount(v);
                                                    setDepCustom("");
                                                    setDepMsg(null);
                                                }}
                                            >
                                                <small>Rp</small>
                                                {num(v)}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className={`s-custom ${depCustom ? "on" : ""}`}>
                                    <span>Rp</span>
                                    <input
                                        inputMode="numeric"
                                        value={depCustom ? num(Number(depCustom)) : ""}
                                        onChange={(e) => {
                                            setDepCustom(e.target.value.replace(/\D/g, ""));
                                            setDepMsg(null);
                                        }}
                                        placeholder="Nominal lain (min. 10.000)"
                                        aria-label="Nominal lain"
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="s-step">
                                    <i>2</i>Metode pembayaran
                                </div>
                                <div className="s-methods" role="radiogroup" aria-label="Metode pembayaran">
                                    {PAY.map((m) => (
                                        <button
                                            type="button"
                                            role="radio"
                                            aria-checked={depPay === m.id}
                                            key={m.id}
                                            className={`s-method ${depPay === m.id ? "on" : ""}`}
                                            onClick={() => setDepPay(m.id)}
                                        >
                                            <span className="s-ico">
                                                <Ico d={PAY_ICON[m.id]} />
                                            </span>
                                            <b>{m.label}</b>
                                            <span className="s-note">{m.note}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </form>
                    </section>

                    <aside className="s-right">
                        <div className="d-balance s-balance-sm">
                            <div className="d-balance-art" aria-hidden="true">
                                <StarCoin scale={0.5} className="float-slow" />
                            </div>
                            <div className="d-balance-inner">
                                <small>Saldo kamu</small>
                                <strong>{rp(saldo)}</strong>
                            </div>
                        </div>

                        <form className="d-card s-sum" onSubmit={deposit} noValidate>
                            <h2>Ringkasan</h2>
                            <div className="u-row">
                                <span>Saldo masuk</span>
                                <b>{rp(Number.isFinite(depValue) ? depValue : 0)}</b>
                            </div>
                            <div className="u-row">
                                <span>Biaya layanan</span>
                                <b>{rp(depFee)}</b>
                            </div>
                            <div className="u-row total">
                                <span>Total bayar</span>
                                <b>{rp((Number.isFinite(depValue) ? depValue : 0) + depFee)}</b>
                            </div>
                            <button className="d-btn u-go" type="submit" disabled={depositing}>
                                {depositing ? "Memproses…" : "Isi saldo sekarang"}
                            </button>
                            {depMsg && <div className={depMsg.ok ? "u-ok" : "u-bad"}>{depMsg.t}</div>}
                            <p className="d-note d-note-mt">
                                Saldo masuk otomatis setelah pembayaran terkonfirmasi.
                            </p>
                        </form>
                    </aside>
                </div>
            )}

            <section className="d-card">
                <div className="d-card-head">
                    <h2>Mutasi saldo</h2>
                </div>
                <ul className="s-mut">
                    {pendingDep && (
                        <li>
                            <span className="s-mut-ico wait" aria-hidden="true">
                                <span className="s-pay-spin" style={{ width: 16, height: 16, borderWidth: 2 }} />
                            </span>
                            <div className="s-mut-txt">
                                <b>Menunggu pembayaran</b>
                                <span>Kode {pendingDep.referenceId}</span>
                            </div>
                            <strong>{rp(pendingDep.amount)}</strong>
                        </li>
                    )}
                    {mutasi.length === 0 && !pendingDep && <li className="d-empty">Belum ada mutasi.</li>}
                    {mutasi.map((m) => (
                        <li key={m.id}>
                            <span className={`s-mut-ico ${m.amount > 0 ? "in" : "out"}`} aria-hidden="true">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={m.amount > 0 ? "M12 19V5M5 12l7-7 7 7" : "M12 5v14M19 12l-7 7-7-7"} />
                                </svg>
                            </span>
                            <div className="s-mut-txt">
                                <b>{m.desc}</b>
                                <span>{m.time}</span>
                            </div>
                            <strong className={m.amount > 0 ? "in" : ""}>
                                {m.amount > 0 ? "+" : "−"} {rp(Math.abs(m.amount))}
                            </strong>
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}