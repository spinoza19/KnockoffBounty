"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function useGsap() {
  if (typeof window !== "undefined" && !registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
  return gsap;
}

/**
 * Honours the OS setting, and adds `?motion=off` so the site can be reviewed,
 * screenshotted or recorded without waiting on entrance animations.
 */
export const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  if (new URLSearchParams(window.location.search).get("motion") === "off") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/** SSR-safe layout effect. */
export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Splits a text node into word spans wrapped in overflow-hidden lines so GSAP
 * can slide them in. Written by hand rather than pulled from SplitText to keep
 * the bundle free of plugin licensing questions.
 */
export function splitWords(element: HTMLElement): HTMLElement[] {
  if (element.dataset.split === "done") {
    return Array.from(element.querySelectorAll<HTMLElement>("[data-word]"));
  }
  const words = (element.textContent || "").split(/\s+/).filter(Boolean);
  element.textContent = "";
  const spans: HTMLElement[] = [];
  words.forEach((word, index) => {
    const mask = document.createElement("span");
    mask.style.display = "inline-block";
    mask.style.overflow = "hidden";
    mask.style.verticalAlign = "bottom";

    const inner = document.createElement("span");
    inner.style.display = "inline-block";
    inner.dataset.word = "";
    inner.textContent = word + (index < words.length - 1 ? " " : "");

    mask.appendChild(inner);
    element.appendChild(mask);
    spans.push(inner);
  });
  element.dataset.split = "done";
  return spans;
}

/** Smooth scrolling. Lenis is loaded lazily so it never blocks first paint. */
export function useLenis() {
  const ref = useRef<any>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let raf = 0;
    let lenis: any;
    let cancelled = false;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelled) return;
      lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      ref.current = lenis;
      const tick = (time: number) => {
        lenis.raf(time);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      lenis.on("scroll", () => ScrollTrigger.update());
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      lenis?.destroy?.();
      ref.current = null;
    };
  }, []);

  return ref;
}
