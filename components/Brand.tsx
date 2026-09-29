// themed: dipakai KHUSUS dari sidebar dashboard/admin (satu-satunya tempat
// dark mode berlaku) supaya wordmark ikut var(--d-text) alih-alih hex mati
// #0b0b0c yang bikin logo nyaris tak kelihatan di atas background gelap.
// Landing page/auth screen lain TIDAK pakai prop ini, jadi tampilannya tetap
// persis sama seperti sebelumnya.
export default function Brand({ light = false, themed = false }: { light?: boolean; themed?: boolean }) {
  const ink = themed ? "var(--d-text)" : light ? "#ffffff" : "#0b0b0c";
  const cut = themed ? "var(--d-bg)" : light ? "#0b0b0c" : "#ffffff";
  return (
    <a
      href="#"
      aria-label="Digora"
      style={{ display: "flex", alignItems: "center", gap: 8, color: ink }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 L22 9 L12 22 L2 9 Z" fill={ink} />
        <path
          d="M2 9 H22 M8 9 L12 2 L16 9 M8 9 L12 22 L16 9"
          fill="none"
          stroke={cut}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
      <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.03em" }}>Digora</span>
    </a>
  );
}