import type { Metadata } from "next";
import Brand from "@/components/Brand";
import "../legal/legal.css";

export const metadata: Metadata = { title: "Kebijakan Privasi — Digora" };

// Sama kayak halaman Syarat & Ketentuan — kerangkanya udah dicocokkan ke data
// yang BENERAN dikumpulkan & pihak ketiga yang BENERAN dipakai Digora
// (Supabase buat database, Paymenku buat payment gateway, supplier Stars/Premium
// & SMM Panel buat neruskan pesanan) — nama supplier produk SENGAJA nggak
// disebut di halaman publik manapun, tapi tetap disarankan direview sama yang
// paham hukum sebelum dipakai produksi.
export default function KebijakanPrivasiPage() {
    return (
        <main className="legal-page">
            <div className="legal-top">
                <Brand />
                <a className="legal-back" href="/" style={{ marginTop: 16, display: "block" }}>
                    ← Kembali ke beranda
                </a>
            </div>

            <article className="legal-card">
                <h1>Kebijakan Privasi</h1>
                <p className="legal-updated">Terakhir diperbarui: 28 September 2026</p>

                <h2>1. Data yang Kami Kumpulkan</h2>
                <ul>
                    <li>Nama lengkap, email, dan username Telegram (kalau diisi) yang kamu isi saat mendaftar.</li>
                    <li>Password akunmu — disimpan dalam bentuk terenkripsi (hashed), tidak pernah disimpan sebagai teks biasa dan tidak bisa dilihat oleh siapa pun termasuk tim Digora.</li>
                    <li>Riwayat transaksi, pesanan, dan saldo akunmu di Digora.</li>
                </ul>

                <h2>2. Bagaimana Data Digunakan</h2>
                <p>
                    Data yang kami kumpulkan dipakai untuk memproses pesananmu, memverifikasi identitas akun, mengirim
                    notifikasi terkait transaksi, serta membantu kami meningkatkan kualitas layanan.
                </p>

                <h2>3. Berbagi Data dengan Pihak Ketiga</h2>
                <p>Untuk menjalankan layanan, Digora bekerja sama dengan beberapa pihak ketiga berikut:</p>
                <ul>
                    <li><b>Payment gateway (Paymenku)</b> — memproses pembayaran QRIS, e-wallet, dan transfer bank. Data yang dibagikan sebatas nominal transaksi dan referensi pembayaran, bukan password akunmu.</li>
                    <li><b>Mitra pemrosesan pesanan (pihak ketiga)</b> — dipakai untuk meneruskan/memproses pesanan Telegram Stars/Premium dan SMM Panel ke tujuan yang kamu masukkan (username Telegram atau link/username akun media sosial). Data yang dibagikan sebatas tujuan pesanan dan jumlah pesanan.</li>
                    <li><b>Penyedia database (Supabase)</b> — menyimpan data akun dan transaksi secara aman.</li>
                </ul>
                <p>Kami tidak menjual atau membagikan datamu ke pihak lain di luar yang disebutkan di atas.</p>

                <h2>4. Keamanan Data</h2>
                <p>
                    Seluruh koneksi ke Digora terenkripsi (HTTPS), password disimpan dalam bentuk hash (bukan teks biasa), dan
                    akses ke data pengguna dibatasi hanya untuk keperluan operasional layanan.
                </p>

                <h2>5. Hak Kamu Sebagai Pengguna</h2>
                <p>
                    Kamu berhak meminta koreksi data, meminta salinan data, atau meminta penghapusan akun beserta datanya
                    dengan menghubungi admin. Beberapa data transaksi mungkin tetap kami simpan untuk keperluan pencatatan
                    keuangan sesuai ketentuan yang berlaku.
                </p>

                <h2>6. Cookies</h2>
                <p>
                    Digora memakai cookie sederhana untuk menjaga sesi login kamu tetap aktif. Cookie ini tidak dipakai untuk
                    melacak aktivitasmu di situs lain.
                </p>

                <h2>7. Perubahan Kebijakan</h2>
                <p>
                    Kebijakan privasi ini bisa diperbarui sewaktu-waktu. Perubahan berlaku sejak dipublikasikan di halaman
                    ini.
                </p>

                <h2>8. Kontak</h2>
                <p>
                    Ada pertanyaan soal data pribadimu di Digora? Hubungi kami lewat{" "}
                    <a href="https://t.me/Digoracs" target="_blank" rel="noopener noreferrer">
                        Telegram @Digoracs
                    </a>
                    .
                </p>
            </article>
        </main>
    );
}