import type { Metadata } from "next";
import Brand from "@/components/Brand";
import "../legal/legal.css";

export const metadata: Metadata = { title: "Syarat & Ketentuan — Digora" };

// Isi pasal-pasalnya masih generik/template — dibuat biar link di form
// daftar gak nunjuk ke halaman kosong lagi. SANGAT disarankan diminta
// direview/disesuaikan oleh yang paham hukum sebelum benar-benar dipakai
// produksi (terutama bagian refund & batasan tanggung jawab), tapi
// kerangkanya sudah dicocokkan ke cara kerja Digora yang sebenarnya
// (saldo/wallet, RSC sebagai supplier, Paymenku sebagai payment gateway).
export default function SyaratKetentuanPage() {
    return (
        <main className="legal-page">
            <div className="legal-top">
                <Brand />
                <a className="legal-back" href="/" style={{ marginTop: 16, display: "block" }}>
                    ← Kembali ke beranda
                </a>
            </div>

            <article className="legal-card">
                <h1>Syarat &amp; Ketentuan</h1>
                <p className="legal-updated">Terakhir diperbarui: 28 September 2026</p>

                <h2>1. Tentang Layanan</h2>
                <p>
                    Digora adalah platform yang menyediakan pembelian Telegram Stars dan Telegram Premium secara online.
                    Pesanan diproses secara otomatis begitu pembayaran terkonfirmasi, dan dikirim langsung ke username
                    Telegram tujuan yang kamu masukkan.
                </p>

                <h2>2. Akun Pengguna</h2>
                <ul>
                    <li>Kamu wajib mengisi data pendaftaran (nama, username Telegram, email) dengan benar dan akurat.</li>
                    <li>Kamu bertanggung jawab menjaga kerahasiaan password akunmu sendiri.</li>
                    <li>Satu akun hanya untuk satu pengguna — dilarang memperjualbelikan atau memindahtangankan akun.</li>
                    <li>Digora berhak menangguhkan akun yang terindikasi melakukan kecurangan atau penyalahgunaan layanan.</li>
                </ul>

                <h2>3. Pemesanan &amp; Pengiriman</h2>
                <p>
                    Pastikan username Telegram tujuan sudah benar sebelum melanjutkan pembayaran — Digora tidak bertanggung
                    jawab atas kesalahan pengiriman akibat username yang salah ketik atau tidak valid yang diisi sendiri oleh
                    pengguna. Waktu pengiriman biasanya otomatis dalam hitungan menit setelah pembayaran terkonfirmasi, namun
                    bisa lebih lama dalam kondisi tertentu di luar kendali Digora (gangguan pada pihak penyedia/supplier,
                    gangguan Telegram, dll).
                </p>

                <h2>4. Pembayaran &amp; Saldo</h2>
                <ul>
                    <li>Pembayaran dapat dilakukan melalui QRIS, e-wallet, atau transfer bank lewat payment gateway pihak ketiga.</li>
                    <li>Saldo yang sudah masuk ke akun Digora-mu dapat dipakai kapan saja untuk membeli produk yang tersedia.</li>
                    <li>Harga produk dapat berubah sewaktu-waktu mengikuti kurs/harga dari supplier, tanpa pemberitahuan sebelumnya.</li>
                </ul>

                <h2>5. Pembatalan &amp; Pengembalian Dana</h2>
                <p>
                    Pesanan yang sudah berhasil diproses dan terkirim tidak dapat dibatalkan atau diminta kembali dananya.
                    Kalau pesanan gagal diproses karena kesalahan sistem Digora, dana akan dikembalikan ke saldo akunmu.
                    Untuk kendala pembayaran atau pesanan, hubungi admin lewat{" "}
                    <a href="https://t.me/Digoracs" target="_blank" rel="noopener noreferrer">
                        Telegram @Digoracs
                    </a>
                    .
                </p>

                <h2>6. Larangan Penggunaan</h2>
                <p>
                    Pengguna dilarang menggunakan layanan Digora untuk tujuan penipuan, pencucian uang, atau aktivitas
                    melanggar hukum lainnya. Pelanggaran dapat berujung pemblokiran akun secara permanen tanpa pengembalian
                    dana.
                </p>

                <h2>7. Batasan Tanggung Jawab</h2>
                <p>
                    Digora tidak bertanggung jawab atas kerugian yang timbul akibat gangguan di luar kendali kami, termasuk
                    namun tidak terbatas pada gangguan layanan Telegram, gangguan payment gateway, atau gangguan dari pihak
                    penyedia (supplier) yang bekerja sama dengan Digora.
                </p>

                <h2>8. Perubahan Ketentuan</h2>
                <p>
                    Digora dapat memperbarui syarat &amp; ketentuan ini sewaktu-waktu. Perubahan berlaku sejak dipublikasikan
                    di halaman ini. Penggunaan layanan secara berkelanjutan dianggap sebagai persetujuan atas ketentuan
                    terbaru.
                </p>

                <h2>9. Kontak</h2>
                <p>
                    Ada pertanyaan soal syarat &amp; ketentuan ini? Hubungi kami lewat{" "}
                    <a href="https://t.me/Digoracs" target="_blank" rel="noopener noreferrer">
                        Telegram @Digoracs
                    </a>
                    .
                </p>
            </article>
        </main>
    );
}