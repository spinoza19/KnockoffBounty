"use client";

import { useRef } from "react";
import { prefersReducedMotion, splitWords, useGsap, useIsomorphicLayoutEffect } from "@/lib/motion";

/** Scroll-triggered word-by-word reveal for a block of text. */
export function RevealText({
  children,
  className,
  style,
  as: Tag = "p",
  delay = 0,
}: {
  children: string;
  className?: string;
  style?: React.CSSProperties;
  as?: any;
  delay?: number;
}) {
  const gsap = useGsap();
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const el = ref.current;
    const ctx = gsap.context(() => {
      const words = splitWords(el);
      gsap.from(words, {
        yPercent: 105,
        duration: 0.85,
        ease: "power3.out",
        stagger: 0.016,
        delay,
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <Tag ref={ref as any} className={className} style={style}>
      {children}
    </Tag>
  );
}

/** Fades and lifts any child block once it scrolls into view. */
export function RevealBlock({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const gsap = useGsap();
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (!ref.current || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from(ref.current, {
        opacity: 0,
        y,
        duration: 0.9,
        ease: "power3.out",
        delay,
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Counts a number up when it enters the viewport. */
export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  className?: string;
}) {
  const gsap = useGsap();
  const ref = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const render = (n: number) => {
      el.textContent =
        n.toLocaleString("en-US", {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }) + suffix;
    };

    if (prefersReducedMotion()) {
      render(value);
      return;
    }

    const ctx = gsap.context(() => {
      const state = { n: 0 };
      gsap.to(state, {
        n: value,
        duration: 1.4,
        ease: "power2.out",
        onUpdate: () => render(state.n),
        scrollTrigger: { trigger: el, start: "top 92%", once: true },
      });
    }, ref);
    return () => ctx.revert();
  }, [value, decimals, suffix]);

  return (
    <span ref={ref} className={className}>
      0{suffix}
    </span>
  );
}
