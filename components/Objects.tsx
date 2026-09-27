import type { CSSProperties } from "react";
import { BoltCoin, Plane, YellowRing, StarCoin, GiftCoin, Blobs, Torus, RpCoin } from "./Coins";

const abs: CSSProperties = { position: "absolute" };

function Dot({ left, top, size }: { left: number; top: number; size: number }) {
  return (
    <div
      style={{ ...abs, left, top, width: size, height: size, borderRadius: "50%", background: "#1b2fe0" }}
    />
  );
}

/** Floating 3D objects around the phone. Coordinates are in the 700x826 scene space. */
export default function Objects() {
  return (
    <>
      <BoltCoin className="float" style={{ ...abs, left: 254, top: 90, animationDelay: "-1s" }} />
      <Plane className="float" style={{ ...abs, left: 440, top: 90, animationDelay: "-3s" }} />
      <YellowRing className="float-slow" style={{ ...abs, left: 648, top: 98 }} />
      <Dot left={392} top={76} size={11} />
      <Dot left={750} top={80} size={5} />
      <Dot left={712} top={100} size={5} />
      <Dot left={684} top={262} size={5} />
      <StarCoin className="float-slow" style={{ ...abs, left: 336, top: 226 }} />
      <GiftCoin className="float" style={{ ...abs, left: 546, top: 226, animationDelay: "-2s" }} />
      <Blobs style={{ ...abs, left: 474, top: 398 }} />
      <Torus className="float" style={{ ...abs, left: 568, top: 480, animationDelay: "-4s" }} />
      <RpCoin className="float-slow" style={{ ...abs, left: 398, top: 540, animationDelay: "-2s" }} />
    </>
  );
}