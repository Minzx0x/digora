import type { MetadataRoute } from "next";

// Next.js otomatis nge-serve ini di /sitemap.xml — gak perlu bikin XML manual.
// Cuma halaman publik yang dimasukin (bukan /dashboard, /admin, /reset-password
// dst yang butuh login atau cuma dipakai lewat link email/transaksional).
export default function sitemap(): MetadataRoute.Sitemap {
  // PENTING: domain apex "digora.codes" (tanpa www) di-redirect 308 ke
  // "www.digora.codes" di level DNS/Vercel — base URL di sitemap HARUS ikut
  // versi yang benar-benar nge-serve (www), bukan yang redirect. Sitemap
  // penuh URL yang redirect ditandai Google sebagai error dan halamannya
  // ditahan dari index (ini penyebab kenapa cuma 1 halaman ke-index).
  const base = process.env.APP_URL || "https://www.digora.codes";
  const now = new Date();

  const pages: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/daftar", priority: 0.8, changeFrequency: "monthly" },
    { path: "/login", priority: 0.6, changeFrequency: "monthly" },
    { path: "/lupa-password", priority: 0.3, changeFrequency: "yearly" },
    { path: "/syarat-ketentuan", priority: 0.3, changeFrequency: "yearly" },
    { path: "/kebijakan-privasi", priority: 0.3, changeFrequency: "yearly" },
  ];

  return pages.map((p) => ({
    url: `${base}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
