"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import Brand from "./Brand";
import { signOutAction } from "@/lib/actions/auth";
import {
    buyOrderAction,
    createDepositAction,
    getDepositStatusAction,
    cancelDepositAction,
    updateProfileAction,
    changePasswordAction,
    type DashboardData,
    type OrderRow,
    type MutasiRow,
    type Status,
} from "@/lib/actions/data";
import { checkUsernameFormat } from "@/lib/telegram";
import type { PackageRow } from "@/lib/actions/catalog";
import { StarCoin } from "./Coins";

const STATUS_LABEL: Record<Status, string> = {
    ok: "Selesai",
    proc: "Diproses",
    wait: "Menunggu bayar",
    fail: "Gagal",
};

// label waktu relatif ("Baru saja", "3 hari lalu", …) dari timestamp ISO dari database
function timeAgo(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const min = Math.floor((Date.now() - d.getTime()) / 60000);
    if (min < 1) return "Baru saja";
    if (min < 60) return `${min} menit lalu`;
    const hour = Math.floor(min / 60);
    if (hour < 24) return `${hour} jam lalu`;
    const day = Math.floor(hour / 24);
    if (day === 1) return "Kemarin";
    if (day < 7) return `${day} hari lalu`;
    const week = Math.floor(day / 7);
    if (week < 5) return week === 1 ? "Minggu lalu" : `${week} minggu lalu`;
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

type Kind = "stars" | "premium";

const MIN_CUSTOM_STARS = 10;

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

function pwStrength(pw: string) {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
    if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
    return pw ? Math.max(1, s) : 0;
}

const I = {
    home: "M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    star: "M12 2l3 6.5 7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9z",
    bag: "M6 7h12l1 13H5zM9 7a3 3 0 0 1 6 0",
    user: "M20 21v-1a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5v1M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
    wallet: "M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2M16 14.5h.01",
    lock: "M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3",
    help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01",
    out: "M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M16 8l4 4-4 4M20 12H9",
};

type View = "beranda" | "saldo" | "stars" | "riwayat" | "profil" | "bantuan";

const NAV: { id: View; label: string; icon: string }[] = [
    { id: "beranda", label: "Beranda", icon: I.home },
    { id: "saldo", label: "Isi Saldo", icon: I.wallet },
    { id: "stars", label: "Stars & Premium", icon: I.star },
    { id: "riwayat", label: "Pesanan saya", icon: I.bag },
    { id: "profil", label: "Profil", icon: I.user },
    { id: "bantuan", label: "Bantuan", icon: I.help },
];

const FAQ = [
    ["Berapa lama Stars masuk?", "Otomatis setelah pembayaran terkonfirmasi, biasanya dalam hitungan menit."],
    ["Salah username, bagaimana?", "Segera hubungi admin sebelum pesanan diproses agar bisa dibantu."],
    ["Bagaimana Telegram Premium dikirim?", "Premium dikirim sebagai hadiah ke username Telegram tujuan setelah pembayaran terkonfirmasi."],
    ["Bagaimana cara isi saldo?", "Buka menu Isi Saldo, pilih nominal dan metode (QRIS, e-wallet, atau transfer bank). Saldo masuk otomatis setelah pembayaran terkonfirmasi."],
    ["Apakah saldo bisa ditarik?", "Saldo dipakai untuk membeli produk di Digora. Hubungi admin untuk pertanyaan soal sisa saldo."],
];

function Ico({ d }: { d: string }) {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={d} />
        </svg>
    );
}

export default function UserDashboard({ initial, catalog }: { initial: DashboardData; catalog: PackageRow[] }) {
    const router = useRouter();
    const [orders, setOrders] = useState<OrderRow[]>(initial.orders);
    const [kind, setKind] = useState<Kind>("stars");
    const [packIdx, setPackIdx] = useState(3);
    const [customStars, setCustomStars] = useState("");
    const [to, setTo] = useState("");
    const [saldo, setSaldo] = useState(initial.profile?.saldo ?? 0);
    const [mutasi, setMutasi] = useState<MutasiRow[]>(initial.mutasi);
    const [depAmount, setDepAmount] = useState(50000);
    const [depCustom, setDepCustom] = useState("");
    const [depPay, setDepPay] = useState<"qris" | "ewallet" | "bank">("qris");
    const [depMsg, setDepMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const [depositing, setDepositing] = useState(false);
    // tagihan Paymenku yang lagi nunggu dibayar user (QR / link bayar) — null kalau
    // belum ada tagihan aktif atau tagihannya sudah kelar (paid/failed/expired).
    const [pendingDep, setPendingDep] = useState<{ referenceId: string; payUrl: string; qrDataUrl: string; amount: number } | null>(
        null,
    );
    const depPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // referenceId tagihan pending yang qr/pollingnya sudah "disiapkan" di client —
    // dipakai biar efek resync di bawah gak kerja dua kali buat tagihan yang sama.
    const depSyncedRef = useRef<string | null>(null);
    const [err, setErr] = useState("");
    const [buying, setBuying] = useState(false);
    // hasil pengecekan username ke Telegram
    const [tg, setTg] = useState<{ state: "idle" | "checking" | "ok" | "bad" | "unknown"; msg: string }>({ state: "idle", msg: "" });
    const [done, setDone] = useState<string | null>(null);
    const [current, setCurrent] = useState<View>("beranda");
    const [profile, setProfile] = useState({
        name: initial.profile?.name ?? "",
        tg: initial.profile?.telegramUsername ?? "",
        email: initial.profile?.email ?? "",
    });
    const [profMsg, setProfMsg] = useState("");
    const [savingProfile, setSavingProfile] = useState(false);
    const [pwMsg, setPwMsg] = useState<{ ok: boolean; t: string } | null>(null);
    const [changingPw, setChangingPw] = useState(false);
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [newPwVal, setNewPwVal] = useState("");

    // setelah router.refresh(), Server Component mengambil data terbaru dan
    // mengirim prop "initial" baru — sinkronkan ke state lokal saat itu terjadi.
    useEffect(() => {
        setOrders(initial.orders);
        setSaldo(initial.profile?.saldo ?? 0);
        setMutasi(initial.mutasi);
        setProfile({
            name: initial.profile?.name ?? "",
            tg: initial.profile?.telegramUsername ?? "",
            email: initial.profile?.email ?? "",
        });
    }, [initial]);

    // satu halaman per menu; disinkronkan dengan #hash supaya tombol back/forward jalan
    useEffect(() => {
        const read = () => {
            const raw = window.location.hash.replace("#", "");
            const h = (raw === "beli" || raw === "premium" ? "stars" : raw === "keamanan" ? "profil" : raw) as View;
            setCurrent(NAV.some((n) => n.id === h) ? h : "beranda");
        };
        read();
        window.addEventListener("hashchange", read);
        return () => window.removeEventListener("hashchange", read);
    }, []);

    // Di HP, menu di atas itu bar yang bisa digeser ke samping — tanpa ini,
    // menu yang lagi aktif bisa nyangkut di pinggir/kepotong kalau letaknya
    // jauh dari kiri, jadi ikut digeser ke tengah/kelihatan penuh tiap dipilih.
    useEffect(() => {
        const el = document.querySelector(".d-link.on");
        el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, [current]);

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

    function go(v: View) {
        setPackIdx(kind === "stars" ? 3 : 1);
        setDone(null);
        setErr("");
        window.location.hash = v;
        window.scrollTo({ top: 0 });
    }

    async function saveProfile(e: React.FormEvent) {
        e.preventDefault();
        setSavingProfile(true);
        const res = await updateProfileAction({ name: profile.name, telegramUsername: profile.tg });
        setSavingProfile(false);
        if (res.error) {
            setProfMsg(res.error);
            return;
        }
        setProfMsg("Profil tersimpan.");
        router.refresh();
        setTimeout(() => setProfMsg(""), 2000);
    }

    async function savePw(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const oldPw = String(f.get("old") ?? "");
        const a = String(f.get("new") ?? "");
        if (a.length < 8) return setPwMsg({ ok: false, t: "Password baru minimal 8 karakter." });
        if (a !== f.get("again")) return setPwMsg({ ok: false, t: "Konfirmasi password tidak sama." });
        setChangingPw(true);
        const res = await changePasswordAction({ oldPassword: oldPw, newPassword: a });
        setChangingPw(false);
        if (res.error) return setPwMsg({ ok: false, t: res.error });
        setPwMsg({ ok: true, t: "Password diperbarui." });
        form.reset();
        setNewPwVal("");
    }

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
    const total = pack.price; // dibayar dari saldo, tanpa biaya tambahan
    const kurang = Math.max(0, total - saldo);
    const customTooLow = isCustom && customStarsNum > 0 && customStarsNum < MIN_CUSTOM_STARS;

    const depValue = depCustom ? Number(depCustom) : depAmount;
    const depFee = depPay === "qris" ? Math.round(depValue * 0.007) : depPay === "ewallet" ? 1500 : 3000;

    const spent = orders.filter((o) => o.status === "ok").reduce((s, o) => s + o.total, 0);
    const active = orders.filter((o) => o.status === "wait" || o.status === "proc").length;

    async function submit(e: React.FormEvent) {
        e.preventDefault();
        setDone(null);
        if (isCustom && customStarsNum < MIN_CUSTOM_STARS) {
            setErr(`Jumlah Stars minimal ${num(MIN_CUSTOM_STARS)}.`);
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
        setDone(`Pesanan ${res.orderCode ?? ""} dibayar dengan saldo. ${pack.label} sedang dikirim ke @${u}.`);
        setTo("");
        setTg({ state: "idle", msg: "" });
        router.refresh();
    }

    // berhenti polling status tagihan (dipanggil pas tagihan kelar, dibatalkan, atau komponen unmount)
    function stopDepositPolling() {
        if (depPollRef.current) {
            clearInterval(depPollRef.current);
            depPollRef.current = null;
        }
    }

    useEffect(() => stopDepositPolling, []);

    // Restore tagihan yang masih 'pending' dari server — dipanggil pas komponen
    // pertama kali dimuat (termasuk sesudah user nge-refresh halaman di tengah
    // proses bayar) dan tiap kali router.refresh() bikin prop "initial" baru.
    // Tanpa ini, kartu QR/status pembayaran hilang begitu halaman di-refresh
    // walau tagihannya di database masih aktif nunggu dibayar.
    useEffect(() => {
        const pd = initial.pendingDeposit;
        if (!pd) {
            depSyncedRef.current = null;
            stopDepositPolling();
            setPendingDep(null);
            return;
        }
        if (depSyncedRef.current === pd.referenceId) return; // sudah disiapkan, gak perlu ulang
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
    }, [initial.pendingDeposit?.referenceId]);

    function startDepositPolling(referenceId: string) {
        stopDepositPolling();
        depPollRef.current = setInterval(async () => {
            const res = await getDepositStatusAction(referenceId);
            if (res.error) return; // coba lagi di tick berikutnya
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
            // status masih "pending" -> lanjut nunggu, cek lagi tick berikutnya
        }, 4000);
    }

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
        depSyncedRef.current = res.referenceId!; // cegah efek resync di atas kerja ulang buat tagihan yang sama
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

    const TITLES: Record<View, [string, string]> = {
        beranda: ["Halo, selamat datang 👋", "Ringkasan akun dan pesanan terbarumu."],
        saldo: ["Isi Saldo", "Isi saldo dulu, lalu beli produk kapan saja tanpa ribet."],
        stars: ["Stars & Premium", "Pilih produk dan paket, isi username, dibayar dari saldo."],
        riwayat: ["Pesanan saya", "Semua riwayat pembelian kamu."],
        profil: ["Profil", "Data akun dan keamanan."],
        bantuan: ["Bantuan", "Jawaban cepat dan kontak admin."],
    };

    const ordersTable = (list: OrderRow[]) => (
        <div className="d-table-wrap">
            <table className="d-table">
                <thead>
                    <tr>
                        <th>Order</th>
                        <th>Tujuan</th>
                        <th>Paket</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Waktu</th>
                    </tr>
                </thead>
                <tbody>
                    {list.map((o) => (
                        <tr key={o.id}>
                            <td>{o.id}</td>
                            <td>{o.to}</td>
                            <td>{o.item}</td>
                            <td>{rp(o.total)}</td>
                            <td>
                                <span className={`d-badge ${o.status}`}>{STATUS_LABEL[o.status]}</span>
                                {o.status === "fail" && o.failReason && (
                                    <div className="mute" style={{ fontSize: 12, marginTop: 2 }}>
                                        {o.failReason}
                                    </div>
                                )}
                            </td>
                            <td className="mute">{o.time}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="dash">
            <aside className="d-side">
                <div className="d-brand">
                    <Brand />
                </div>

                <nav className="d-nav" aria-label="Menu akun">
                    {NAV.map((n) => (
                        <a
                            key={n.id}
                            className={`d-link ${current === n.id ? "on" : ""}`}
                            href={`#${n.id}`}
                            aria-current={current === n.id ? "page" : undefined}
                            title={n.label}
                            onClick={(e) => {
                                e.preventDefault();
                                go(n.id);
                            }}
                        >
                            <Ico d={n.icon} />
                            <span className="d-link-label">{n.label}</span>
                        </a>
                    ))}
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

            <main className="d-main">
                <header className="d-top">
                    <div>
                        <h1 className="d-hi">{TITLES[current][0]}</h1>
                        <p className="d-sub">{TITLES[current][1]}</p>
                    </div>
                    {current === "stars" && (
                        <div className="d-actions">
                            <a className="u-saldo-pill" href="#saldo" onClick={(e) => { e.preventDefault(); go("saldo"); }}>
                                Saldo <b>{rp(saldo)}</b>
                            </a>
                        </div>
                    )}
                    {current === "beranda" && (
                        <div className="d-actions">
                            <a className="d-btn" href="#stars" onClick={(e) => { e.preventDefault(); go("stars"); }}>+ Beli Stars</a>
                        </div>
                    )}
                </header>

                {current === "beranda" && (
                    <>
                        <section className="d-grid-top">
                            <div className="d-balance">
                                <div className="d-balance-art" aria-hidden="true">
                                    <StarCoin scale={0.7} className="float-slow" />
                                </div>
                                <div style={{ position: "relative", zIndex: 1 }}>
                                    <small>Saldo kamu</small>
                                    <strong>{rp(saldo)}</strong>
                                </div>
                                <div className="d-balance-foot">
                                    <a className="d-pill solid" href="#saldo" onClick={(e) => { e.preventDefault(); go("saldo"); }}>+ Isi saldo</a>
                                    <a className="d-pill" href="#stars" onClick={(e) => { e.preventDefault(); go("stars"); }}>Beli Stars</a>
                                </div>
                            </div>

                            <div className="d-stats">
                                <div className="d-stat">
                                    <span>Total pesanan</span>
                                    <strong>{orders.length}</strong>
                                </div>
                                <div className="d-stat">
                                    <span>Total belanja</span>
                                    <strong>{rp(spent)}</strong>
                                </div>
                                <div className="d-stat">
                                    <span>Pesanan aktif</span>
                                    <strong>{active}</strong>
                                </div>
                            </div>
                        </section>
                        <section className="d-card">
                            <div className="d-card-head">
                                <h2>Pesanan terbaru</h2>
                                <a className="auth-link" style={{ color: "#2540ff", fontWeight: 700, fontSize: 14 }} href="#riwayat" onClick={(e) => { e.preventDefault(); go("riwayat"); }}>Lihat semua →</a>
                            </div>
                            {ordersTable(orders.slice(0, 3))}
                        </section>
                    </>
                )}

                {current === "stars" && (
                    <section className="d-card">
                        <div className="d-card-head">
                            <h2>Beli Telegram Stars &amp; Premium</h2>
                        </div>

                        <form className="u-form" onSubmit={submit} noValidate>
                            <div>
                                <div className="s-step"><i>1</i>Pilih produk</div>
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
                                                setDone(null);
                                                setErr("");
                                            }}
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </div>
                                <div className="u-label" style={{ marginTop: 18 }}>Pilih paket</div>
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
                                    <div className={`u-custom ${isCustom ? "on" : ""} ${customTooLow ? "err" : ""}`}>
                                        <div className="u-custom-txt">
                                            <b>Jumlah lain</b>
                                            <span>Masukkan sendiri, minimal {num(MIN_CUSTOM_STARS)} Stars</span>
                                        </div>
                                        <div className="u-custom-input">
                                            <input
                                                inputMode="numeric"
                                                value={customStars ? num(customStarsNum) : ""}
                                                onFocus={() => setPackIdx(-1)}
                                                onChange={(e) => {
                                                    setCustomStars(e.target.value.replace(/\D/g, ""));
                                                    setPackIdx(-1);
                                                }}
                                                placeholder="cth. 750"
                                                aria-label="Jumlah Stars custom"
                                            />
                                            <span>Stars</span>
                                        </div>
                                        {isCustom && customStarsNum >= MIN_CUSTOM_STARS && (
                                            <span className="u-custom-price">≈ {rp(pack.price)}</span>
                                        )}
                                        {customTooLow && (
                                            <span className="u-custom-price bad">Minimal {num(MIN_CUSTOM_STARS)} Stars</span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="u-cols">
                                <div>
                                    <div className="s-step"><i>2</i>Username Telegram tujuan</div>
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
                                        const color = err || tg.state === "bad" ? "#c62d3a" : tg.state === "ok" ? "#12874a" : "#8b8b94";
                                        return (
                                            <span role="status" style={{ display: "block", marginTop: 6, fontSize: 12.5, fontWeight: 600, color }}>
                                                {tg.state === "ok" && !err ? "✓ " : ""}
                                                {msg}
                                            </span>
                                        );
                                    })()}
                                    <p className="d-note" style={{ marginTop: 8 }}>
                                        Bisa untuk dirimu sendiri atau dikirim ke teman. Pastikan username sudah benar.
                                    </p>

                                    <div className="s-step" style={{ marginTop: 24 }}><i>3</i>Pembayaran</div>
                                    <div className={`u-saldo-box ${kurang > 0 ? "low" : ""}`}>
                                        <span className="u-saldo-box-ico" aria-hidden="true">
                                            <Ico d={I.wallet} />
                                        </span>
                                        <div>
                                            <span>Saldo kamu</span>
                                            <b>{rp(saldo)}</b>
                                        </div>
                                        {kurang > 0 ? (
                                            <a href="#saldo" onClick={(e) => { e.preventDefault(); go("saldo"); }}>Kurang {rp(kurang)} · Isi saldo →</a>
                                        ) : (
                                            <small>✓ Cukup untuk pembelian ini</small>
                                        )}
                                    </div>
                                </div>

                                <div className="u-sum">
                                    <div className="u-sum-head">Ringkasan pesanan</div>
                                    <div className="u-row"><span>Paket</span><b>{pack.label}</b></div>
                                    <div className="u-row"><span>Harga</span><b>{rp(pack.price)}</b></div>
                                    <div className="u-row"><span>Sisa saldo</span><b>{rp(Math.max(0, saldo - total))}</b></div>
                                    <div className="u-row total"><span>Total</span><b>{rp(total)}</b></div>
                                    <button
                                        className="d-btn u-go"
                                        type="submit"
                                        disabled={kurang > 0 || buying || (isCustom && customStarsNum < MIN_CUSTOM_STARS)}
                                    >
                                        {buying ? "Memproses…" : "Beli dengan saldo"}
                                    </button>
                                    {done && <div className="u-ok">{done}</div>}
                                </div>
                            </div>
                        </form>
                    </section>
                )}

                {current === "saldo" && (
                    <>
                        {pendingDep ? (
                            <div className="s-grid">
                                <section className="d-card s-pay-wait">
                                    <div className="s-pay-wait-head">
                                        <span className="s-pay-spin" aria-hidden="true" />
                                        <div>
                                            <h2 style={{ margin: 0 }}>Menunggu pembayaran</h2>
                                            <p className="d-note" style={{ margin: "4px 0 0" }}>
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
                                    <div className="d-balance" style={{ minHeight: 132 }}>
                                        <div className="d-balance-art" aria-hidden="true">
                                            <StarCoin scale={0.5} className="float-slow" />
                                        </div>
                                        <div style={{ position: "relative", zIndex: 1 }}>
                                            <small>Saldo kamu</small>
                                            <strong style={{ fontSize: 36 }}>{rp(saldo)}</strong>
                                        </div>
                                    </div>

                                    <div className="d-card s-sum">
                                        <h2>Ringkasan</h2>
                                        <div className="u-row"><span>Saldo masuk</span><b>{rp(pendingDep.amount)}</b></div>
                                        <div className="u-row"><span>Kode tagihan</span><b style={{ fontSize: 12 }}>{pendingDep.referenceId}</b></div>
                                        <p className="d-note" style={{ marginTop: 12 }}>Saldo masuk otomatis setelah pembayaran terkonfirmasi.</p>
                                    </div>
                                </aside>
                            </div>
                        ) : (
                            <div className="s-grid">
                                <section className="d-card s-form">
                                    <form className="u-form" onSubmit={deposit} noValidate>
                                        <div>
                                            <div className="s-step"><i>1</i>Pilih nominal</div>
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
                                            <div className="s-step"><i>2</i>Metode pembayaran</div>
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
                                    <div className="d-balance" style={{ minHeight: 132 }}>
                                        <div className="d-balance-art" aria-hidden="true">
                                            <StarCoin scale={0.5} className="float-slow" />
                                        </div>
                                        <div style={{ position: "relative", zIndex: 1 }}>
                                            <small>Saldo kamu</small>
                                            <strong style={{ fontSize: 36 }}>{rp(saldo)}</strong>
                                        </div>
                                    </div>

                                    <form className="d-card s-sum" onSubmit={deposit} noValidate>
                                        <h2>Ringkasan</h2>
                                        <div className="u-row"><span>Saldo masuk</span><b>{rp(Number.isFinite(depValue) ? depValue : 0)}</b></div>
                                        <div className="u-row"><span>Biaya layanan</span><b>{rp(depFee)}</b></div>
                                        <div className="u-row total"><span>Total bayar</span><b>{rp((Number.isFinite(depValue) ? depValue : 0) + depFee)}</b></div>
                                        <button className="d-btn u-go" type="submit" disabled={depositing}>
                                            {depositing ? "Memproses…" : "Isi saldo sekarang"}
                                        </button>
                                        {depMsg && <div className={depMsg.ok ? "u-ok" : "u-bad"}>{depMsg.t}</div>}
                                        <p className="d-note" style={{ marginTop: 12 }}>Saldo masuk otomatis setelah pembayaran terkonfirmasi.</p>
                                    </form>
                                </aside>
                            </div>
                        )}

                        <section className="d-card">
                            <div className="d-card-head"><h2>Mutasi saldo</h2></div>
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
                )}

                {current === "riwayat" && (
                    <section className="d-card">
                        <div className="d-card-head"><h2>Riwayat pesanan</h2></div>
                        {ordersTable(orders)}
                    </section>
                )}

                {current === "profil" && (
                    <div className="u-narrow" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                        <div className="d-card">
                            <div className="d-card-head"><h2>Profil</h2></div>
                            <form className="u-mini" onSubmit={saveProfile}>
                                <label>Nama lengkap
                                    <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Nama kamu" />
                                </label>
                                <label>Username Telegram
                                    <input value={profile.tg} onChange={(e) => setProfile({ ...profile, tg: e.target.value.replace(/^@/, "") })} placeholder="@username" />
                                </label>
                                <label>Email
                                    <input type="email" value={profile.email} disabled readOnly title="Email tidak bisa diubah di sini" />
                                </label>
                                <p className="d-note" style={{ margin: "-4px 0 4px" }}>Email dipakai untuk login, tidak bisa diganti dari halaman ini.</p>
                                <button className="d-btn" type="submit" disabled={savingProfile}>
                                    {savingProfile ? "Menyimpan…" : "Simpan profil"}
                                </button>
                                {profMsg && <div className="u-ok">{profMsg}</div>}
                            </form>
                        </div>

                        <div className="d-card">
                            <div className="d-card-head"><h2>Keamanan</h2></div>
                            <form className="u-mini" onSubmit={savePw}>
                                <label>Password lama
                                    <div className="u-mini-pw">
                                        <input name="old" type={showOldPw ? "text" : "password"} autoComplete="current-password" />
                                        <button type="button" className="eye" onClick={() => setShowOldPw((s) => !s)}>
                                            {showOldPw ? "Tutup" : "Lihat"}
                                        </button>
                                    </div>
                                </label>
                                <label>Password baru
                                    <div className="u-mini-pw">
                                        <input
                                            name="new"
                                            type={showNewPw ? "text" : "password"}
                                            autoComplete="new-password"
                                            placeholder="Minimal 8 karakter"
                                            value={newPwVal}
                                            onChange={(e) => setNewPwVal(e.target.value)}
                                        />
                                        <button type="button" className="eye" onClick={() => setShowNewPw((s) => !s)}>
                                            {showNewPw ? "Tutup" : "Lihat"}
                                        </button>
                                    </div>
                                    {newPwVal && (
                                        <div className="pw-meter" aria-hidden="true">
                                            {[1, 2, 3].map((n) => (
                                                <i key={n} className={pwStrength(newPwVal) >= n ? `on${pwStrength(newPwVal)}` : ""} />
                                            ))}
                                        </div>
                                    )}
                                </label>
                                <label>Ulangi password baru
                                    <div className="u-mini-pw">
                                        <input name="again" type={showNewPw ? "text" : "password"} autoComplete="new-password" />
                                    </div>
                                </label>
                                <button className="d-btn" type="submit" disabled={changingPw}>
                                    {changingPw ? "Memproses…" : "Ganti password"}
                                </button>
                                {pwMsg && <div className={pwMsg.ok ? "u-ok" : "u-bad"}>{pwMsg.t}</div>}
                            </form>
                        </div>
                    </div>
                )}

                {current === "bantuan" && (
                    <section className="d-card">
                        <div className="d-card-head">
                            <h2>Bantuan</h2>
                            <a className="d-btn" href="https://t.me/Digoracs" target="_blank" rel="noopener noreferrer">
                                Chat admin
                            </a>
                        </div>
                        <div className="u-faq">
                            {FAQ.map(([q, a]) => (
                                <details key={q}>
                                    <summary>{q}</summary>
                                    <p>{a}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}