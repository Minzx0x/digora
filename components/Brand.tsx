// themed: dipakai KHUSUS dari sidebar dashboard/admin (satu-satunya tempat
// dark mode berlaku) supaya wordmark ikut var(--d-text) alih-alih hex mati
// #0b0b0c yang bikin logo nyaris tak kelihatan di atas background gelap.
// Landing page/auth screen lain TIDAK pakai prop ini, jadi tampilannya tetap
// persis sama seperti sebelumnya. Ikonnya (public/logo-mark.png) di-filter
// hitam polos (brightness(0)) lewat class di globals.css -- landing page &
// dashboard mode terang selalu hitam, dashboard mode gelap & konteks "light"
// (di atas background gelap, mis. Footer/AuthShell/AdminLoginForm) tetap
// warna aslinya biar kebaca.
export default function Brand({ light = false, themed = false }: { light?: boolean; themed?: boolean }) {
  const ink = themed ? "var(--d-text)" : light ? "#ffffff" : "#0b0b0c";
  const iconClass = "brand-icon" + (light ? " brand-icon-light" : themed ? " brand-icon-themed" : "");
  return (
    <a
      href="#"
      aria-label="Digora"
      style={{ display: "flex", alignItems: "center", gap: 8, color: ink }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-mark.png" width={36} height={31} alt="" className={iconClass} style={{ objectFit: "contain" }} />
      <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Digora</span>
    </a>
  );
}