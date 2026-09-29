import type { CSSProperties } from "react";
import { Plane, StarCoin, HeartCoin, Blobs, RpCoin } from "./Coins";

const abs: CSSProperties = { position: "absolute" };

function Dot({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <div
      style={{ ...abs, left, top, width: size, height: size, borderRadius: "50%", background: "#1b2fe0" }}
    />
  );
}

// Cuma sisain objek yang beneran nyambung ke produk (biar gak berisik & gak
// ngalihin fokus dari headline): StarCoin = Stars, Plane = logo Telegram,
// HeartCoin = like/engagement SMM Panel, RpCoin = harga/pembayaran.
// BoltCoin, YellowRing, Torus, dan sebagian Dot dihapus karena gak ada makna
// jelas ke produk, cuma nambah keramaian visual.
/** Floating 3D objects around the phone. Coordinates are in the 700x826 scene space. */
export default function Objects() {
  return (
    <>
      <Plane className="float" style={{ ...abs, left: 440, top: 90, animationDelay: "-3s" }} />
      <Dot left={392} top={76} size={11} />
      <Dot left={712} top={100} size={5} />
      <StarCoin className="float-slow" style={{ ...abs, left: 336, top: 226 }} />
      <HeartCoin className="float" style={{ ...abs, left: 546, top: 226, animationDelay: "-2s" }} />
      <Blobs style={{ ...abs, left: 474, top: 398 }} />
      <RpCoin className="float-slow" style={{ ...abs, left: 398, top: 540, animationDelay: "-2s" }} />
    </>
  );
}