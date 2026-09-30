import Reveal from "./Reveal";
import { FaHeadset } from "react-icons/fa6";
import IconBadge from "./IconBadge";

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
        q: "Apa itu SMM Panel?",
        a: "Layanan menambah followers, likes, views, dan interaksi lain untuk akun media sosial (Instagram, TikTok, YouTube, dll). Masukkan link/username tujuan, pilih layanan, lalu bayar.",
    },
    {
        q: "Followers/likes SMM berkurang, gimana?",
        a: "Sebagian layanan punya garansi refill (keterangan ada di tiap layanan) — hubungi admin buat diproses ulang gratis kalau turun.",
    },
    {
        q: "Metode pembayaran apa saja yang tersedia?",
        a: "Kamu bisa membayar lewat QRIS, e-wallet, atau transfer bank.",
    },
    {
        q: "Apakah Digora aman dan terpercaya?",
        a: "Pembayaran diproses lewat payment gateway resmi (bukan transfer manual ke rekening pribadi), saldo dan riwayat semua pesananmu tercatat otomatis di akun, dan ada Tiket Support kalau ada kendala.",
    },
    {
        q: "Kalau pesanan gagal, uang saya hilang?",
        a: "Tidak. Kalau pesanan ditandai gagal, saldo otomatis dikembalikan ke akunmu — nggak perlu diminta manual ke admin.",
    },
    {
        q: "Kenapa harus isi saldo dulu, bukan bayar langsung per pesanan?",
        a: "Biar belanja berikutnya lebih cepat — sekali isi saldo, tinggal pilih produk dan pesan tanpa harus bayar ulang tiap transaksi. Sisa saldo tetap tersimpan di akunmu, dipakai kapan saja.",
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
                        <IconBadge
                            icon={FaHeadset}
                            bg="#2540ff"
                            size={56}
                            className="float"
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