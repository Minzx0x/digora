import Reveal from "./Reveal";
import { StarCoin, RpCoin, BoltCoin } from "./Coins";

const art = { position: "absolute", right: 14, top: 10 } as const;

const STEPS = [
    {
        n: "1",
        title: "Pilih paket Stars",
        text: "Tentukan jumlah Stars yang kamu butuhkan, untuk dirimu atau temanmu.",
        art: <StarCoin className="float-slow" scale={0.4} style={{ ...art, right: 20 }} />,
    },
    {
        n: "2",
        title: "Isi username & bayar",
        text: "Masukkan username Telegram tujuan, pilih metode pembayaran, lalu selesaikan pembayaran.",
        art: <RpCoin className="float" scale={0.5} style={art} />,
    },
    {
        n: "3",
        title: "Stars langsung masuk",
        text: "Stars dikirim otomatis begitu pembayaranmu terkonfirmasi.",
        art: <BoltCoin className="float-slow" scale={0.58} style={{ ...art, right: 10, top: 14 }} />,
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