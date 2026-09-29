const FAQ = [
    ["Berapa lama Stars masuk?", "Otomatis setelah pembayaran terkonfirmasi, biasanya dalam hitungan menit."],
    ["Salah username, bagaimana?", "Segera hubungi admin sebelum pesanan diproses agar bisa dibantu."],
    ["Bagaimana Telegram Premium dikirim?", "Premium dikirim sebagai hadiah ke username Telegram tujuan setelah pembayaran terkonfirmasi."],
    ["Apa itu SMM Panel?", "Layanan menambah followers, likes, views, dan interaksi lain untuk akun media sosial (Instagram, TikTok, YouTube, dll). Tinggal masukkan link/username tujuan, lalu bayar pakai saldo."],
    ["Berapa lama pesanan SMM diproses?", "Beda-beda tiap layanan — cek estimasi waktu di kotak detail layanan sebelum beli. Umumnya mulai jalan dalam hitungan menit sampai beberapa jam."],
    ["Followers/likes SMM berkurang, bagaimana?", "Kalau layanannya punya Garansi Refill (tertera di detail layanan), hubungi admin untuk diminta pengisian ulang gratis ke supplier."],
    ["Pesanan SMM gagal, saldo hangus?", "Tidak — kalau pesanan (Stars, Premium, atau SMM) ditandai gagal oleh admin, saldo yang terpakai otomatis dikembalikan."],
    ["Bagaimana cara isi saldo?", "Buka menu Isi Saldo, pilih nominal dan metode (QRIS, e-wallet, atau transfer bank). Saldo masuk otomatis setelah pembayaran terkonfirmasi."],
    ["Apakah saldo bisa ditarik?", "Saldo dipakai untuk membeli produk di Digora. Hubungi admin untuk pertanyaan soal sisa saldo."],
];

// Server Component murni — FAQ statis, "use client" cuma perlu buat elemen
// <details> bawaan HTML yang memang jalan tanpa JS sama sekali.
export default function BantuanView() {
    return (
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
    );
}