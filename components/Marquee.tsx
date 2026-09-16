"use client";

import { useRef } from "react";
import { prefersReducedMotion, useGsap, useIsomorphicLayoutEffect } from "@/lib/motion";

export function Marquee({
  items,
  speed = 28,
  reverse = false,
}: {
  items: string[];
  speed?: number;
  reverse?: boolean;
}) {
  const gsap = useGsap();
  const root = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".marquee",
        { xPercent: reverse ? -50 : 0 },
        { xPercent: reverse ? 0 : -50, duration: speed, ease: "none", repeat: -1 },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  const doubled = [...items, ...items];

  return (
    <div
      ref={root}
      className="overflow-hidden py-4 select-none"
      style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}
      aria-hidden="true"
    >
      <div className="marquee">
        {doubled.map((item, i) => (
          <span key={i} className="display whitespace-nowrap" style={{ fontSize: "clamp(1.5rem, 3.6vw, 3rem)" }}>
            {item}
            <span style={{ opacity: 0.3, paddingInline: "1.2rem" }}>◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
