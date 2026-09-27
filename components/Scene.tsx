import Phone from "./Phone";
import Objects from "./Objects";

/** The visual half of the hero: blue panel, phone, floating 3D objects. 700 x 826. */
export default function Scene() {
  return (
    <div style={{ position: "relative", width: 700, height: 826 }}>
      <div
        style={{
          position: "absolute",
          left: 6,
          top: 6,
          width: 536,
          height: 814,
          borderRadius: 26,
          background:
            "linear-gradient(175deg, #e1e9ff 0%, #a9bfff 26%, #5b78ff 58%, #2540ff 84%, #1a2cff 100%)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: -100,
            top: 250,
            width: 200,
            height: 320,
            borderRadius: "50%",
            background: "linear-gradient(120deg, #1b1f6a, #0a0c38)",
            transform: "rotate(-16deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 30,
            top: 690,
            width: 380,
            height: 96,
            borderRadius: "50%",
            background: "#0c1150",
            transform: "rotate(-3deg)",
            opacity: 0.95,
          }}
        />
        <Phone />
      </div>
      <Objects />
    </div>
  );
}
