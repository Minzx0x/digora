// Nama & kategori layanan mentah dari smmflare ada ribuan variasi teks unik
// dalam bahasa Inggris — nggak realistis diterjemahkan satu-satu dengan
// akurat. Ini kamus istilah yang PALING SERING BERULANG (High Quality, Non
// Drop, Instant Start, Days Refill, dst) diganti otomatis ke Indonesia.
// Dicek frasa panjang dulu baru kata tunggal, biar urutan kata hasil
// translate tetap masuk akal ("High Quality" -> "Kualitas Tinggi", bukan
// asal tukar kata per kata). Dipakai bareng oleh SmmView.tsx (customer) dan
// AdminSmmCatalog.tsx (admin) — SATU kamus, bukan diduplikat, biar dua sisi
// selalu konsisten.
const TRANSLATE_DICT: [RegExp, string][] = [
    [/high quality/gi, "Kualitas Tinggi"],
    [/premium quality/gi, "Kualitas Premium"],
    [/low drop/gi, "Drop Rendah"],
    [/non ?drop/gi, "Tanpa Drop"],
    [/no drop/gi, "Tanpa Drop"],
    [/instant start/gi, "Mulai Instan"],
    [/lifetime refill/gi, "Garansi Seumur Hidup"],
    [/(\d+) days? refill/gi, "Garansi $1 Hari"],
    [/no refill/gi, "Tanpa Garansi"],
    [/auto refill/gi, "Garansi Otomatis"],
    [/live stream viewers/gi, "Penonton Live Stream"],
    [/old accounts?/gi, "Akun Lama"],
    [/hq accounts?/gi, "Akun HQ"],
    [/real ?[- ]?mixed/gi, "Real Campuran"],
    [/max (\d)/gi, "Maks $1"],
    [/cheapest/gi, "Termurah"],
    [/worldwide/gi, "Seluruh Dunia"],
    [/fast[- ]?after[- ]?update/gi, "Cepat Setelah Update"],
    [/speed/gi, "Kecepatan"],
    [/instant/gi, "Instan"],
    [/refill/gi, "Garansi"],
    [/minutes?/gi, "Menit"],
    [/hours?/gi, "Jam"],
    [/days?/gi, "Hari"],
];

export function translateServiceName(name: string): string {
    let out = name;
    for (const [pattern, replacement] of TRANSLATE_DICT) {
        out = out.replace(pattern, replacement);
    }
    return out;
}
