// TODO: ganti angka contoh dengan data asli Digora.
const STATS = [
  {
    value: "10rb+",
    label: "Stars terkirim",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1" y="3" width="12" height="12" rx="3.5" fill="#c9c9d0" />
        <circle cx="12.5" cy="3.5" r="3" fill="#e5484d" />
      </svg>
    ),
  },
  {
    value: "24/7",
    label: "Layanan otomatis",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1" y="5" width="14" height="10" rx="3.5" fill="#c9c9d0" />
        <rect x="4.5" y="1" width="7" height="6" rx="2.5" fill="#f5b83a" />
      </svg>
    ),
  },
];

export default function Stats() {
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 28 }}>
      {STATS.map((s, i) => (
        <div key={s.label} style={{ display: "flex", alignItems: "stretch", gap: 28 }}>
          {i > 0 && <div style={{ width: 2, background: "#1a1a1f" }} />}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.icon}
            <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: "-0.035em", color: "#0b0b0c" }}>
              {s.value}
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "#74747d" }}>{s.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}