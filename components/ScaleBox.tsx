"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders children in a fixed design-size box (width x height) and scales it.
 *
 * fit="width"    -> shrinks to the container width, never scales above 1 (mobile).
 * fit="viewport" -> scales to fill the browser window (both width and height,
 *                   up to maxScale), so the hero uses the whole screen on
 *                   large monitors and when the browser is zoomed out.
 */
export default function ScaleBox({
  width,
  height,
  children,
  fit = "width",
  maxScale = 1,
  padding = 24,
}: {
  width: number;
  height: number;
  children: ReactNode;
  fit?: "width" | "viewport";
  maxScale?: number;
  padding?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      if (fit === "viewport") {
        const s = Math.min(
          (window.innerWidth - padding * 2) / width,
          (window.innerHeight - padding * 2) / height,
          maxScale,
        );
        setScale(Math.max(s, 0.3));
      } else {
        setScale(Math.min(1, el.clientWidth / width));
      }
    };

    update();
    window.addEventListener("resize", update);
    const ro = fit === "width" ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      window.removeEventListener("resize", update);
      ro?.disconnect();
    };
  }, [width, height, fit, maxScale, padding]);

  const outer =
    fit === "viewport"
      ? { width: width * scale, height: height * scale }
      : { width: "100%", maxWidth: width, height: height * scale };

  return (
    <div ref={ref} style={{ position: "relative", margin: "0 auto", ...outer }}>
      <div
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}