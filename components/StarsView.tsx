"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { buyOrderAction } from "@/lib/actions/data";
import { checkUsernameFormat } from "@/lib/telegram";
import type { PackageRow } from "@/lib/actions/catalog";
import Toast from "./Toast";

type Kind = "stars" | "premium";

const MIN_CUSTOM_STARS = 50;
const MAX_CUSTOM_STARS = 10000;

// harga per Stars mengikuti tingkatan paket asli dari database (makin banyak, makin
// murah per Stars) — dipakai untuk menghitung harga saat user masukkan jumlah Stars
// sendiri di luar paket baku. `tiers` harus sudah terurut naik berdasarkan amount.
function starRate(amount: number, tiers: PackageRow[]): number {
    if (tiers.length === 0) return 0;
    let rate = tiers[0].price / tiers[0].amount;
    for (const t of tiers) {
        if (amount >= t.amount) rate = t.price / t.amount;
    }
    return rate;
}

const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");
const num = (n: number) => n.toLocaleString("id-ID");

const I = {
    star: "M12 2l3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z",
    wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2M16 14.5h.01",
};

function Ico({ d }: { d: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

export default function StarsView({ catalog, saldo }: { catalog: PackageRow[]; saldo: number }) {
    const router = useRouter();
    const [kind, setKind] = useState<Kind>("stars");
    const [packIdx, setPackIdx] = useState(3);
    const [customStars, setCustomStars] = useState("");
    const [to, setTo] = useState("");
    const [err, setErr] = useState("");
    const [buying, setBuying] = useState(false);
    const [tg, setTg] = useState<{ state: "idle" | "checking" | "ok" | "bad" | "unknown"; msg: string }>({ state: "idle", msg: "" });
    const [done, setDone] = useState<string | null>(null);

    // validasi username: format langsung, lalu cek ke Telegram (ditunda 600 ms setelah berhenti mengetik)
    useEffect(() => {
        const u = to.trim();
        if (!u) {
            setTg({ state: "idle", msg: "" });
            return;
        }
        const bad = checkUsernameFormat(u);
        if (bad) {
            setTg({ state: "bad", msg: bad });
            return;
        }
        setTg({ state: "checking", msg: "Memeriksa username…" });
        const ctrl = new AbortController();
        const t = setTimeout(async () => {
            try {
                const r = await fetch(`/api/telegram/check?u=${encodeURIComponent(u.replace(/^@/, ""))}`, { signal: ctrl.signal });
                const d = await r.json();
                if (d.status === "ok") setTg({ state: "ok", msg: `Akun ditemukan: ${d.name}` });
                else if (d.status === "not_found") setTg({ state: "bad", msg: "Username tidak ditemukan di Telegram." });
                else if (d.status === "not_user") setTg({ state: "bad", msg: "Ini channel/grup, bukan akun pengguna." });
                else if (d.status === "invalid") setTg({ state: "bad", msg: d.message });
                else setTg({ state: "unknown", msg: "Tidak bisa dicek otomatis. Pastikan username sudah benar." });
            } catch (e) {
                if ((e as Error).name !== "AbortError") setTg({ state: "unknown", msg: "Tidak bisa dicek otomatis. Pastikan username sudah benar." });
            }
        }, 600);
        return () => {
            clearTimeout(t);
            ctrl.abort();
        };
    }, [to]);

    const packs = catalog.filter((p) => p.kind === kind).sort((a, b) => a.amount - b.amount);
    const starTiers = catalog.filter((p) => p.kind === "stars").sort((a, b) => a.amount - b.amount);
    const isCustom = kind === "stars" && packIdx === -1;
    const customStarsNum = Math.max(0, Math.round(Number(customStars) || 0));
    const pack = isCustom
        ? {
            label: `${num(customStarsNum)} Stars`,
            amount: customStarsNum,
            unit: "Stars",
            price: Math.round(customStarsNum * starRate(customStarsNum, starTiers)),
            note: "Custom",
        }
        : packs.length > 0
            ? packs[Math.min(packIdx, packs.length - 1)]
            : { label: "-", amount: 0, unit: "", price: 0, note: "" };
    const total = pack.price;
    const kurang = Math.max(0, total - saldo);
    const customTooLow = isCustom && customStarsNum > 0 && customStarsNum < MIN_CUSTOM_STARS;
    const customTooHigh = isCustom && customStarsNum > MAX_CUSTOM_STARS;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        if (isCustom && customStarsNum < MIN_CUSTOM_STARS) {
            setErr(`Jumlah Stars minimal ${num(MIN_CUSTOM_STARS)}.`);
            return;
        }
        if (isCustom && customStarsNum > MAX_CUSTOM_STARS) {
            setErr(`Jumlah Stars maksimal ${num(MAX_CUSTOM_STARS)}.`);
            return;
        }
        const u = to.trim().replace(/^@/, "");
        const fmt = checkUsernameFormat(to);
        if (fmt) {
            setErr(fmt);
            return;
        }
        if (tg.state === "checking") {
            setErr("Tunggu sebentar, username sedang diperiksa.");
            return;
        }
        if (tg.state === "bad") {
            setErr(tg.msg);
            return;
        }
        if (saldo < total) {
            setErr(`Saldo kurang ${rp(kurang)}. Isi saldo dulu.`);
            return;
        }
        setErr("");
        setBuying(true);
        const res = await buyOrderAction({
            targetUsername: u,
            kind,
            packageLabel: pack.label,
            units: pack.amount,
            total,
        });
        setBuying(false);
        if (res.error) {
            setErr(res.error);
            return;
        }
        // Toast ngambang di atas viewport, BUKAN redirect — tetap di halaman
        // ini (bisa langsung pesan lagi), notifikasinya tetap kelihatan
        // berapa pun posisi scroll-nya.
        setDone(`Pesanan ${res.orderCode ?? ""} dibayar dengan saldo. ${pack.label} sedang dikirim ke @${u}.`);
        setTo("");
        setTg({ state: "idle", msg: "" });
        router.refresh();
    }

    return (
        <>
            {done && <Toast message={done} onDone={() => setDone(null)} />}
            <section className="d-card">
                <div className="d-card-head">
                    <h2>Beli Telegram Stars &amp; Premium</h2>
                </div>

            <form className="u-form" onSubmit={submit} noValidate>
                <div>
                    <div className="s-step">
                        <i>1</i>Pilih produk
                    </div>
                    <div className="u-kind" role="tablist" aria-label="Jenis produk">
                        {([["stars", "Telegram Stars"], ["premium", "Telegram Premium"]] as const).map(([k, l]) => (
                            <button
                                key={k}
                                type="button"
                                role="tab"
                                aria-selected={kind === k}
                                className={kind === k ? "on" : ""}
                                onClick={() => {
                                    setKind(k);
                                    setPackIdx(k === "stars" ? 3 : 1);
                                    setCustomStars("");
                                    setErr("");
                                }}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                    <div className="u-label u-label-mt">
                        Pilih paket
                    </div>
                    <div className={`u-packs ${kind === "premium" ? "u-packs-3" : ""}`} role="radiogroup" aria-label="Paket">
                        {packs.map((p, i) => (
                            <button
                                type="button"
                                role="radio"
                                aria-checked={p === pack}
                                key={p.label}
                                className={`u-pack ${p === pack ? "on" : ""}`}
                                onClick={() => setPackIdx(i)}
                            >
                                <span className="u-pack-ico" aria-hidden="true">
                                    <svg width="16" height="16" viewBox="0 0 24 24">
                                        <path d={I.star} fill={kind === "stars" ? "#f5b400" : "#2540ff"} />
                                    </svg>
                                </span>
                                <span className="u-pack-stars">
                                    {num(p.amount)} <small>{p.unit}</small>
                                </span>
                                <span className="u-pack-price">{rp(p.price)}</span>
                                <span className="u-pack-note">{p.note}</span>
                            </button>
                        ))}
                    </div>
                    {packs.length === 0 && <p className="d-note">Katalog belum tersedia. Hubungi admin.</p>}

                    {kind === "stars" && (
                        <div className={`u-custom ${isCustom ? "on" : ""} ${customTooLow || customTooHigh ? "err" : ""}`}>
                            <div className="u-custom-txt">
                                <b>Jumlah lain</b>
                                <span>
                                    Masukkan sendiri, {num(MIN_CUSTOM_STARS)}–{num(MAX_CUSTOM_STARS)} Stars
                                </span>
                            </div>
                            <div className="u-custom-input">
                                <input
                                    inputMode="numeric"
                                    value={customStars ? num(customStarsNum) : ""}
                                    onFocus={() => setPackIdx(-1)}
                                    onChange={(e) => {
                                        const raw = e.target.value.replace(/\D/g, "");
                                        const n = raw ? Math.min(Number(raw), MAX_CUSTOM_STARS) : 0;
                                        setCustomStars(raw ? String(n) : "");
                                        setPackIdx(-1);
                                    }}
                                    placeholder="cth. 750"
                                    aria-label="Jumlah Stars custom"
                                />
                                <span>Stars</span>
                            </div>
                            {isCustom && customStarsNum >= MIN_CUSTOM_STARS && customStarsNum <= MAX_CUSTOM_STARS && (
                                <span className="u-custom-price">≈ {rp(pack.price)}</span>
                            )}
                            {customTooLow && <span className="u-custom-price bad">Minimal {num(MIN_CUSTOM_STARS)} Stars</span>}
                            {customTooHigh && <span className="u-custom-price bad">Maksimal {num(MAX_CUSTOM_STARS)} Stars</span>}
                        </div>
                    )}
                </div>

                <div className="u-cols">
                    <div>
                        <div className="s-step">
                            <i>2</i>Username Telegram tujuan
                        </div>
                        <div className={`u-input ${err || tg.state === "bad" ? "err" : ""}`}>
                            <span>@</span>
                            <input
                                value={to}
                                onChange={(e) => {
                                    setTo(e.target.value);
                                    setErr("");
                                }}
                                placeholder="username"
                                aria-label="Username Telegram"
                                aria-invalid={!!err || tg.state === "bad"}
                                autoComplete="off"
                            />
                        </div>
                        {(() => {
                            const msg = err || (tg.state === "idle" ? "" : tg.msg);
                            if (!msg) return null;
                            const stateClass = err || tg.state === "bad" ? "bad" : tg.state === "ok" ? "ok" : "";
                            return (
                                <span role="status" className={`u-status ${stateClass}`}>
                                    {tg.state === "ok" && !err ? "✓ " : ""}
                                    {msg}
                                </span>
                            );
                        })()}
                        <p className="d-note d-note-sm-mt">
                            Bisa untuk dirimu sendiri atau dikirim ke teman. Pastikan username sudah benar.
                        </p>

                        <div className="s-step s-step-mt">
                            <i>3</i>Pembayaran
                        </div>
                        <div className={`u-saldo-box ${kurang > 0 ? "low" : ""}`}>
                            <span className="u-saldo-box-ico" aria-hidden="true">
                                <Ico d={I.wallet} />
                            </span>
                            <div>
                                <span>Saldo kamu</span>
                                <b>{rp(saldo)}</b>
                            </div>
                            {kurang > 0 ? (
                                <Link href="/dashboard/saldo">Kurang {rp(kurang)} · Isi saldo →</Link>
                            ) : (
                                <small>✓ Cukup untuk pembelian ini</small>
                            )}
                        </div>
                    </div>

                    <div className="u-sum">
                        <div className="u-sum-head">Ringkasan pesanan</div>
                        <div className="u-row">
                            <span>Paket</span>
                            <b>{pack.label}</b>
                        </div>
                        <div className="u-row">
                            <span>Harga</span>
                            <b>{rp(pack.price)}</b>
                        </div>
                        <div className="u-row">
                            <span>Sisa saldo</span>
                            <b>{rp(Math.max(0, saldo - total))}</b>
                        </div>
                        <div className="u-row total">
                            <span>Total</span>
                            <b>{rp(total)}</b>
                        </div>
                        <button
                            className="d-btn u-go"
                            type="submit"
                            disabled={kurang > 0 || buying || (isCustom && (customStarsNum < MIN_CUSTOM_STARS || customStarsNum > MAX_CUSTOM_STARS))}
                        >
                            {buying ? "Memproses…" : "Beli dengan saldo"}
                        </button>
                    </div>
                </div>
            </form>
            </section>
        </>
    );
}