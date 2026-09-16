"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion, useGsap, useIsomorphicLayoutEffect } from "@/lib/motion";

const SLATS = 7;

/**
 * Counter + vertical slat wipe. The slats are the transition device the whole
 * site reuses, so the first thing a visitor sees also teaches the language.
 */
export function Preloader({ onDone }: { onDone?: () => void }) {
  const gsap = useGsap();
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const [gone, setGone] = useState(false);

  // Tied to `gone`, not to mount: the component stays mounted after it hides
  // itself, so an unmount-only cleanup would leave the page locked forever.
  useEffect(() => {
    if (gone) {
      document.body.classList.remove("no-scroll");
      return;
    }
    document.body.classList.add("no-scroll");
    return () => document.body.classList.remove("no-scroll");
  }, [gone]);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) {
      setGone(true);
      onDone?.();
      return;
    }

    // requestAnimationFrame is throttled to a crawl in a background tab, so a
    // timeline alone can leave someone staring at a frozen counter when they
    // come back. Wall-clock fallback: the intro never outlives its welcome.
    const bail = window.setTimeout(() => {
      setGone(true);
      onDone?.();
    }, 4200);

    const ctx = gsap.context(() => {
      const state = { value: 0 };
      const tl = gsap.timeline({
        onComplete: () => {
          window.clearTimeout(bail);
          setGone(true);
          onDone?.();
        },
      });

      tl.to(state, {
        value: 100,
        duration: 1.5,
        ease: "power2.inOut",
        onUpdate: () => {
          if (counter.current) {
            counter.current.textContent = String(Math.round(state.value)).padStart(3, "0");
          }
        },
      })
        .to(".preloader-word", { yPercent: -110, duration: 0.6, ease: "power3.inOut", stagger: 0.04 }, "-=0.15")
        .to(
          ".preloader-slat",
          { yPercent: -100, duration: 0.85, ease: "power4.inOut", stagger: 0.06 },
          "-=0.35",
        );
    }, root);

    return () => {
      window.clearTimeout(bail);
      ctx.revert();
    };
  }, []);

  if (gone) return null;

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[90]"
      aria-hidden="true"
      style={{ pointerEvents: "none" }}
    >
      <div className="absolute inset-0 flex">
        {Array.from({ length: SLATS }).map((_, i) => (
          <div
            key={i}
            className="preloader-slat h-full flex-1"
            style={{ background: "var(--ink-deep)" }}
          />
        ))}
      </div>

      <div className="absolute inset-0 flex flex-col justify-between p-[var(--gutter)]">
        <div className="overflow-hidden">
          <div className="preloader-word label" style={{ color: "#8a7c66" }}>
            GenLayer · Studio Next · Chain 61997
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <div className="overflow-hidden">
            <h1
              className="display preloader-word"
              style={{ color: "#e8dcc6", fontSize: "clamp(2.4rem, 9vw, 7rem)" }}
            >
              Knockoff
              <br />
              Bounty
            </h1>
          </div>
          <div className="overflow-hidden">
            <span
              ref={counter}
              className="preloader-word display tabular-nums"
              style={{ color: "#8a7c66", fontSize: "clamp(2rem, 6vw, 5rem)" }}
            >
              000
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
