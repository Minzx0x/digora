/** @type {import('next').NextConfig} */
const nextConfig = {
    // Next.js (mode dev) defaultnya nge-print tiap panggilan Server Action ke
    // terminal LENGKAP DENGAN ARGUMENNYA — termasuk password mentah kalau
    // argumennya password (kejadian di signInAction/signUpAction/adminSignInAction,
    // semua nerima password sebagai parameter biasa). Ini bukan sesuatu yang kita
    // tulis di kode kita, murni bawaan Next.js buat debugging — dimatikan di sini
    // supaya gak ada lagi kredensial nyangkut di log terminal / file log.
    logging: {
        serverFunctions: false,
    },
    // Default Next.js buat body Server Action cuma 1MB -- kepentok pas kirim
    // lampiran foto tiket (maks 5MB, lihat MAX_ATTACHMENT_BYTES di
    // lib/actions/tickets.ts), munculnya "Body exceeded 1 MB limit" dan
    // request-nya gagal total (500). Dinaikin ke 8mb biar ada ruang lebih
    // dari cukup buat file 5MB + overhead multipart + field lain di form.
    experimental: {
        serverActions: {
            bodySizeLimit: "8mb",
        },
    },
};

export default nextConfig;
