"use client";

import { useLayoutEffect, useState } from "react";
import ScaleBox from "./ScaleBox";
import HeroArc from "./HeroArc";
import Brand from "./Brand";
import Nav from "./Nav";

const TITLE = (
  <>
    SMM Panel &amp; Telegram Stars
    <br />
    Murah, Cepat, Tanpa Ribet
  </>
);

const DESC =
  "Beli Telegram Stars/Premium atau tingkatkan followers, likes, dan views di Instagram, TikTok, YouTube, dan lainnya — semua dalam satu akun, proses otomatis 24 jam.";

// Design size of the desktop hero (in design px). Width grows on wide screens.
const DESIGN_W = 1200;
const DESIGN_H = 826;
const ARC_W = 900;
const ARC_H = 300;
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
            Daftar sekarang
          </a>
        </div>
        <div className="m-body">
          <div className="m-text m-text-center">
            <p className="eyebrow" style={{ margin: "0 auto 16px" }}>
              1 Akun untuk Telegram &amp; SMM Panel
            </p>
            <h1 className="m-title">{TITLE}</h1>
            <p className="m-desc">{DESC}</p>
            <div className="hero-cta-row">
              <a className="btn-dark" href="/daftar" style={{ marginLeft: 0 }}>
                Daftar gratis →
              </a>
            </div>
          </div>
          <div style={{ padding: "0 24px" }}>
            <ScaleBox width={ARC_W} height={ARC_H}>
              <HeroArc />
            </ScaleBox>
          </div>
        </div>
      </div>
    );
  }

  const arcLeft = (w - ARC_W) / 2;

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
          <div style={{ position: "absolute", left: 40, top: 34 }}>
            <Brand />
          </div>
          <div style={{ position: "absolute", left: "50%", top: 28, transform: "translateX(-50%)" }}>
            <Nav />
          </div>
          <a className="btn-dark" href="/daftar" style={{ position: "absolute", right: 32, top: 28, marginLeft: 0 }}>
            Daftar
          </a>

          <div style={{ position: "absolute", left: 0, top: 122, width: w, textAlign: "center" }}>
            <p className="eyebrow" style={{ margin: "0 auto 18px" }}>
              1 Akun untuk Telegram &amp; SMM Panel
            </p>
            <h1
              style={{
                margin: "0 auto",
                maxWidth: 780,
                fontSize: 52,
                lineHeight: 1.08,
                fontWeight: 700,
                letterSpacing: "-0.04em",
                color: "#0b0b0c",
              }}
            >
              {TITLE}
            </h1>
            <p
              style={{
                margin: "22px auto 0",
                maxWidth: 560,
                fontSize: 17,
                lineHeight: 1.6,
                fontWeight: 500,
                color: "#6f6f78",
              }}
            >
              {DESC}
            </p>
            <div className="hero-cta-row">
              <a className="btn-dark" href="/daftar" style={{ marginLeft: 0 }}>
                Daftar gratis →
              </a>
            </div>
          </div>

          <div style={{ position: "absolute", left: arcLeft, top: 452 }}>
            <HeroArc />
          </div>
        </div>
      </div>
    </div>
  );
}
