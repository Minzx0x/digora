export default function Brand({ light = false }: { light?: boolean }) {
  const ink = light ? "#ffffff" : "#0b0b0c";
  const cut = light ? "#0b0b0c" : "#ffffff";
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