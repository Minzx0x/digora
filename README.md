# Digora — Landing Page (Next.js)

Landing page toko top up game & gift card. Next.js (App Router) + TypeScript, tanpa library UI tambahan.

## Menjalankan

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
```

## Struktur

```
app/
  layout.tsx      # metadata (title/description), font Hanken Grotesk (self-hosted via @fontsource)
  page.tsx        # halaman utama
  globals.css     # style dasar, nav, layout mobile
  icon.svg        # favicon
components/
  Hero.tsx        # susunan desktop (skala 1200px) dan mobile (< 1024px)
  Scene.tsx       # panel biru + HP + objek 3D
  Phone.tsx       # mockup HP dan tumpukan voucher
  Objects.tsx     # koin petir, gamepad, koin diamond, koin kado, koin Rp, dll (SVG)
  Nav.tsx, Brand.tsx, Stats.tsx, ScaleBox.tsx
```

## Yang perlu kamu ganti

- Angka statistik di `components/Stats.tsx` ("10rb+", "24/7") adalah contoh.
- Teks headline dan deskripsi ada di `components/Hero.tsx`.
- Link menu (`#produk`, `#harga`, `#bantuan`, `#beli`) di `components/Nav.tsx` masih placeholder.
- Judul dan deskripsi SEO ada di `app/layout.tsx`.
