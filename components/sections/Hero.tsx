"use client";

import { useRef } from "react";
import { EXPLORER_URL, getContractAddress } from "@/lib/genlayer/client";
import { GENLAYER_CHAIN } from "@/lib/genlayer/network";
import { shortAddress } from "@/lib/format";
import { prefersReducedMotion, useGsap, useIsomorphicLayoutEffect } from "@/lib/motion";

export function Hero({ ready }: { ready: boolean }) {
  const gsap = useGsap();
  const root = useRef<HTMLElement>(null);
  const contract = getContractAddress();

  useIsomorphicLayoutEffect(() => {
    if (!ready || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.from(".hero-word > span", { yPercent: 108, duration: 1.05, stagger: 0.08 })
        .from(".hero-meta", { opacity: 0, y: 14, duration: 0.7, stagger: 0.07 }, "-=0.55")
        .from(".hero-lede", { opacity: 0, y: 18, duration: 0.8 }, "-=0.5")
        .from(".hero-cue", { opacity: 0, duration: 0.6 }, "-=0.4");

      // The wordmark drifts and fades as the page scrolls past it.
      gsap.to(".hero-word", {
        yPercent: -22,
        opacity: 0.25,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 },
      });
    }, root);

    return () => ctx.revert();
  }, [ready]);

  return (
    <section
      ref={root}
      className="relative min-h-[100svh] flex flex-col justify-between pt-28 pb-8"
    >
      <div className="shell flex flex-wrap items-start justify-between gap-6">
        <div className="hero-meta max-w-[24ch]">
          <div className="label">A court for stolen designs</div>
          <p className="mt-3 text-[13px]" style={{ color: "var(--fg-muted)" }}>
            Independent designers get copied in weeks and have no neutral place to prove it. This is
            that place.
          </p>
        </div>

        <div className="hero-meta text-right ml-auto">
          <div className="label">Network</div>
          <div className="mt-1 text-[12px]">{GENLAYER_CHAIN.name}</div>
          <div className="label mt-3">Contract</div>
          {contract ? (
            <a
              className="mt-1 block text-[12px] link-underline"
              href={`${EXPLORER_URL}/address/${contract}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              {shortAddress(contract, 6)}
            </a>
          ) : (
            <div className="mt-1 text-[12px]" style={{ color: "var(--verdict-copy)" }}>
              not configured
            </div>
          )}
        </div>
      </div>

      <div className="w-full overflow-hidden px-[calc(var(--gutter)-0.5rem)]">
        <h1 className="display display-fill hero-word reveal-line" aria-label="Knockoff Bounty">
          <span aria-hidden="true">Knockoff</span>
        </h1>
        <h1
          className="display display-fill hero-word reveal-line"
          style={{ color: "var(--fg-muted)" }}
          aria-hidden="true"
        >
          <span>Bounty</span>
        </h1>
      </div>

      <div className="shell flex flex-wrap items-end justify-between gap-8 pt-10">
        <p className="hero-lede max-w-[46ch] text-[15px] leading-relaxed">
          Register what you made. Stake a bounty on it. When it shows up on a marketplace under
          someone else&apos;s name, an independent jury of validators rules on the evidence — and
          leaves you a timestamped record you can actually file.
        </p>

        <div className="hero-cue label flex items-center gap-3">
          <span>Scroll</span>
          <span
            aria-hidden
            style={{ display: "inline-block", width: 48, height: 1, background: "var(--line-strong)" }}
          />
        </div>
      </div>
    </section>
  );
}
