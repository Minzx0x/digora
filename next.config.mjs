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
};

export default nextConfig;
