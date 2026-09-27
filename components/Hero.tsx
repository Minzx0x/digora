"use client";

import { useLayoutEffect, useState } from "react";
import ScaleBox from "./ScaleBox";
import Scene from "./Scene";
import Brand from "./Brand";
import Nav from "./Nav";
import Stats from "./Stats";

const TITLE = (
  <>
    Telegram Stars
    <br />
    murah, cepat,
    <br />
    tanpa ribet
  </>
);

const DESC =
  "Beli Stars untuk dirimu atau kirim ke teman. Cukup masukkan username, bayar, dan Stars langsung masuk.";

// Design size of the desktop hero (in design px). Width grows on wide screens.
const DESIGN_W = 1200;
const DESIGN_H = 826;
const SCENE_W = 700;
const TEXT_W = 430;
const PAD = 12; // must match .page padding in globals.css
const MAX_W = 1800; // batas lebar kartu (unit desain) supaya tidak melar di layar/zoom ekstrem

export default function Hero() {
  const [mobile, setMobile] = useState(false);
  const [scale, setScale] = useState(1);
  const [w, setW] = useState(DESIGN_W);
  // sembunyikan sampai ukuran layar terukur, supaya tidak ada "loncatan" saat pindah halaman
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setMobile(vw < 1024);

      const availW = vw - PAD * 2;
      const availH = vh - PAD * 2;
      const byWidth = availW / DESIGN_W;
      const byHeight = availH / DESIGN_H;

      if (byWidth <= byHeight) {
        // narrow window: fit the design width, height follows
        setScale(Math.max(byWidth, 0.3));
        setW(DESIGN_W);
      } else {
        // wide window: fit the height, stretch the card to the full width
        const s = byHeight; // tanpa batas atas: saat browser di-zoom out, hero ikut membesar memenuhi layar
        setScale(s);
        setW(Math.min(MAX_W, Math.max(DESIGN_W, availW / s)));
      }
    };
    update();
    setReady(true);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (mobile) {
    return (
      <div className="card m-card" style={{ visibility: ready ? "visible" : "hidden" }}>
        <div className="m-top">
          <Brand />
          <a className="btn-dark" href="/daftar" style={{ marginLeft: 0 }}>
            Beli Stars
          </a>
        </div>
        <ScaleBox width={SCENE_W} height={DESIGN_H}>
          <Scene />
        </ScaleBox>
        <div className="m-text">
          <h1 className="m-title">{TITLE}</h1>
          <p className="m-desc">{DESC}</p>
        </div>
        <div className="m-stats">
          <Stats />
        </div>
      </div>
    );
  }

  // text column is centered in the space right of the scene, never closer than 44px
  const textLeft = SCENE_W + Math.max(44, (w - SCENE_W - TEXT_W) / 2);

  return (
    <div style={{ width: w * scale, height: DESIGN_H * scale, margin: "0 auto", visibility: ready ? "visible" : "hidden" }}>
      <div
        style={{
          width: w,
          height: DESIGN_H,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div className="card" style={{ width: w, height: DESIGN_H }}>
          <Scene />
          <div style={{ position: "absolute", left: 40, top: 34 }}>
            <Brand />
          </div>
          <div style={{ position: "absolute", right: 32, top: 28 }}>
            <Nav />
          </div>
          <div style={{ position: "absolute", left: textLeft, top: 276, width: TEXT_W }}>
            <h1
              style={{
                margin: 0,
                fontSize: 58,
                lineHeight: 1.04,
                fontWeight: 700,
                letterSpacing: "-0.045em",
                color: "#0b0b0c",
              }}
            >
              {TITLE}
            </h1>
            <p
              style={{
                margin: "30px 0 0",
                width: 350,
                fontSize: 16,
                lineHeight: 1.6,
                fontWeight: 500,
                color: "#6f6f78",
              }}
            >
              {DESC}
            </p>
          </div>
          <div style={{ position: "absolute", left: textLeft, top: 664 }}>
            <Stats />
          </div>
        </div>
      </div>
    </div>
  );
}