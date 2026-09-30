import Reveal from "./Reveal";
import { FaBagShopping, FaWallet, FaBolt } from "react-icons/fa6";
import IconBadge from "./IconBadge";

const art = { position: "absolute", right: 14, top: 10 } as const;

const STEPS = [
    {
        n: "1",
        title: "Pilih produk",
        text: "Stars & Premium buat Telegram, atau layanan SMM Panel buat Instagram, TikTok, YouTube, dan lainnya.",
        art: <IconBadge icon={FaBagShopping} bg="#2540ff" className="float-slow" style={art} />,
    },
    {
        n: "2",
        title: "Isi tujuan & bayar",
        text: "Masukkan username Telegram atau link/username akun media sosial tujuan, pilih metode pembayaran, lalu selesaikan pembayaran.",
        art: <IconBadge icon={FaWallet} bg="#12874a" className="float" style={art} />,
    },
    {
        n: "3",
        title: "Diproses otomatis",
        text: "Pesanan dikirim/diproses otomatis begitu pembayaranmu terkonfirmasi.",
        art: <IconBadge icon={FaBolt} bg="#f5a623" color="#0e0d3a" className="float-slow" style={art} />,
    },
];

export default function HowItWorks() {
    return (
        <section id="cara-order" className="sec sec-dark">
            <div className="sec-in">
                <Reveal>
                    <div className="sec-head">
                        <div>
                            <p className="eyebrow eyebrow-light">Cara order</p>
                            <h2 className="h2">
                                Tiga langkah,
                                <br />
                                selesai dalam hitungan menit
                            </h2>
                        </div>
                    </div>
                </Reveal>

                <ol className="steps">
                    {STEPS.map((s, i) => (
                        <li key={s.n} className="step-li">
                            <Reveal delay={i * 120} className="step">
                                <div className="step-art" aria-hidden="true">
                                    {s.art}
                                </div>
                                <span className="step-n">{s.n}</span>
                                <h3 className="step-title">{s.title}</h3>
                                <p className="step-text">{s.text}</p>
                            </Reveal>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}