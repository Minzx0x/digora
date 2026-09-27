import Reveal from "./Reveal";
import { BoltCoin } from "./Coins";

const FAQ = [
    {
        q: "Apa itu Telegram Stars?",
        a: "Stars adalah mata uang digital di Telegram. Kamu bisa memakainya untuk membeli konten dan layanan digital, mendukung kreator, atau mengirim hadiah di dalam aplikasi.",
    },
    {
        q: "Bagaimana Stars sampai ke akunku?",
        a: "Masukkan username Telegram tujuan saat order. Setelah pembayaran terkonfirmasi, Stars dikirim otomatis.",
    },
    {
        q: "Berapa lama prosesnya?",
        a: "Pesanan diproses otomatis setelah pembayaran terkonfirmasi. Umumnya selesai dalam hitungan detik sampai beberapa menit.",
    },
    {
        q: "Bisa dikirim ke teman?",
        a: "Bisa. Cukup isi username Telegram temanmu sebagai tujuan saat order.",
    },
    {
        q: "Bagaimana kalau salah username?",
        a: "Periksa username sebelum membayar. Pesanan yang sudah terkirim tidak bisa dibatalkan, jadi pastikan datanya benar.",
    },
    {
        q: "Metode pembayaran apa saja yang tersedia?",
        a: "Kamu bisa membayar lewat QRIS, e-wallet, atau transfer bank.",
    },
];

export default function Faq() {
    return (
        <section id="bantuan" className="sec">
            <div className="sec-in faq">
                <Reveal>
                    <p className="eyebrow">Bantuan</p>
                    <h2 className="h2">Ada pertanyaan?</h2>
                    <p className="lead">Jawaban singkat untuk hal yang paling sering ditanyakan.</p>

                    <div className="faq-card">
                        <BoltCoin
                            className="float"
                            scale={0.62}
                            style={{ position: "absolute", right: 14, top: 14 }}
                        />
                        <h3>Butuh bantuan langsung?</h3>
                        <p>Admin siap membantu kalau pesananmu belum masuk.</p>
                        <a className="btn-light faq-btn" href="https://t.me/Digoracs" target="_blank" rel="noopener noreferrer">
                            Chat admin
                        </a>
                    </div>
                </Reveal>

                <Reveal delay={120}>
                    <div className="faq-list">
                        {FAQ.map((f, i) => (
                            <details key={f.q} className="faq-item" open={i === 0}>
                                <summary>{f.q}</summary>
                                <p>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </Reveal>
            </div>
        </section>
    );
}