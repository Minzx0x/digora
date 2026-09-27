import type { CSSProperties } from "react";

const abs: CSSProperties = { position: "absolute" };

type VoucherProps = {
  style: CSSProperties;
  label: string;
  dot: CSSProperties;
  labelColor: string;
  labelSize?: number;
  children?: React.ReactNode;
};

function Voucher({ style, label, dot, labelColor, labelSize = 12, children }: VoucherProps) {
  return (
    <div style={{ ...abs, overflow: "hidden", ...style }}>
      <div style={{ ...abs, ...dot }} />
      <div
        style={{
          ...abs,
          left: (dot.left as number) + 22,
          top: (dot.top as number) - 1,
          fontSize: labelSize,
          fontWeight: 700,
          color: labelColor,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

export default function Phone() {
  return (
    <div
      style={{
        ...abs,
        left: 46,
        top: 122,
        width: 290,
        height: 570,
        transform: "rotate(-8deg)",
      }}
    >
      {/* side edge (extrusion) */}
      <div
        style={{
          ...abs,
          left: -10,
          top: 8,
          width: 290,
          height: 570,
          borderRadius: 48,
          background: "#0a1fa6",
          boxShadow: "0 34px 44px rgba(6,10,80,0.45)",
        }}
      />
      {/* frame */}
      <div
        style={{
          ...abs,
          left: 0,
          top: 0,
          width: 290,
          height: 570,
          padding: 8,
          borderRadius: 46,
          background: "linear-gradient(160deg, #3a63ff, #1332e0)",
          boxShadow: "inset 3px 0 0 #6d92ff",
        }}
      >
        {/* screen */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            borderRadius: 39,
            background: "#09090c",
            overflow: "hidden",
          }}
        >
          <div style={{ ...abs, left: 24, top: 17, fontSize: 11, fontWeight: 700, color: "#ffffff" }}>
            9:41
          </div>
          <div
            style={{ ...abs, left: 99, top: 12, width: 76, height: 22, borderRadius: 12, background: "#000000" }}
          />
          <div
            style={{
              ...abs,
              left: 0,
              top: 66,
              width: "100%",
              textAlign: "center",
              fontSize: 30,
              lineHeight: 1.04,
              fontWeight: 600,
              color: "#ffffff",
              letterSpacing: "-0.02em",
            }}
          >
            Telegram
            <br />
            Stars
          </div>

          {/* stacked voucher cards */}
          <Voucher
            label="50 Stars"
            labelColor="#09090c"
            dot={{ left: 14, top: 13, width: 12, height: 12, borderRadius: "50%", border: "2px solid #09090c" }}
            style={{ left: 44, top: 176, width: 196, height: 100, borderRadius: 18, background: "#f3c4da", transform: "rotate(-2deg)" }}
          >
            <div style={{ ...abs, left: 130, top: -24, width: 110, height: 80, borderRadius: "50%", background: "#e9a8c6" }} />
          </Voucher>

          <Voucher
            label="100 Stars"
            labelColor="#ffffff"
            dot={{ left: 14, top: 13, width: 12, height: 12, borderRadius: "50%", background: "#ffffff" }}
            style={{ left: 24, top: 214, width: 226, height: 100, borderRadius: 18, background: "#2f63ff", transform: "rotate(-3deg)" }}
          >
            <div style={{ ...abs, left: 160, top: 30, width: 80, height: 80, borderRadius: "50%", background: "#1a3fd6" }} />
          </Voucher>

          <Voucher
            label="250 Stars"
            labelColor="#09090c"
            dot={{ left: 14, top: 15, width: 12, height: 12, borderRadius: "50%", border: "2px solid #09090c" }}
            style={{ left: 30, top: 258, width: 236, height: 108, borderRadius: 18, background: "#f9d9e8", transform: "rotate(-2deg)" }}
          >
            <div style={{ ...abs, left: 150, top: 20, width: 110, height: 110, borderRadius: "50%", border: "2px solid #2f63ff" }} />
          </Voucher>

          <Voucher
            label="500 Stars"
            labelColor="#09090c"
            labelSize={13}
            dot={{ left: 18, top: 18, width: 14, height: 14, borderRadius: "50%", border: "2px solid #09090c" }}
            style={{ left: 14, top: 314, width: 252, height: 160, borderRadius: 24, background: "#f6b93b", transform: "rotate(-2deg)" }}
          >
            <div style={{ ...abs, left: -76, top: 62, width: 160, height: 150, borderRadius: "50%", background: "#09090c" }} />
            <div
              style={{ ...abs, left: 100, top: 84, fontSize: 22, fontWeight: 800, color: "#0b0b0c", letterSpacing: "-0.02em" }}
            >
              500 Stars
            </div>
            <div style={{ ...abs, left: 100, top: 114, fontSize: 11, fontWeight: 600, color: "#3a2a05" }}>
              Kirim ke @username
            </div>
          </Voucher>

          <svg
            style={{ ...abs, left: 0, bottom: 0 }}
            width="274"
            height="120"
            viewBox="0 0 274 120"
            aria-hidden="true"
          >
            <path d="M58 120 C66 66 94 54 108 96 C118 34 168 32 176 96 C188 74 222 80 236 120z" fill="#b8a4dc" />
            <circle cx="148" cy="70" r="20" fill="none" stroke="#e5484d" strokeWidth="2" />
          </svg>
        </div>
      </div>
    </div>
  );
}