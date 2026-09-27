"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * Fades + slides its children in when they scroll into view.
 * Content is visible by default (no JS / already on screen / reduced motion).
 */
export default function Reveal({
    children,
    delay = 0,
    className = "",
    style,
}: {
    children: ReactNode;
    delay?: number;
    className?: string;
    style?: CSSProperties;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return;

        setState("hidden");
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setState("shown");
                    io.disconnect();
                }
            },
            { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const cls = state === "hidden" ? "rv-hidden" : state === "shown" ? "rv-shown" : "";

    return (
        <div
            ref={ref}
            className={`${cls} ${className}`.trim()}
            style={{ transitionDelay: state === "shown" ? `${delay}ms` : undefined, ...style }}
        >
            {children}
        </div>
    );
}