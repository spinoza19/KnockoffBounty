"use client";

import { STEPS } from "@/lib/constants";
import { fromAtto } from "@/lib/format";
import { useStats } from "@/lib/hooks/useKnockoffBounty";
import { CountUp, RevealBlock, RevealText } from "../Reveal";

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div style={{ borderTop: "1px solid var(--line-strong)" }} className="pt-4">
      <div className="label">{label}</div>
      <div className="display mt-2" style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)" }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Problem() {
  const { data: stats } = useStats();

  return (
    <section id="how" className="shell py-24 md:py-36">
      <div className="grid md:grid-cols-12 gap-10 md:gap-16">
        <div className="md:col-span-5">
          <div className="label">01 — The problem</div>
          <RevealText
            as="h2"
            className="display mt-6"
            style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
          >
            The judge earns commission on the counterfeit
          </RevealText>
        </div>

        <div className="md:col-span-7 flex flex-col gap-6 text-[15px] leading-relaxed">
          <RevealText as="p">
            Your work sells. Six weeks later it is on a marketplace at a fifth of the price. You file
            an IP complaint. It is refused — because a complaint is only an assertion, and the only
            party who can rule on it is the platform that takes a cut of every sale.
          </RevealText>
          <RevealText as="p" className="max-w-[58ch]">
            Large brands solve this with registries, lawyers and enforcement teams. Somebody shipping
            forty pieces a month has none of that. The missing piece is not detection software. It is
            a neutral referee whose answer carries weight.
          </RevealText>
          <RevealBlock>
            <p
              className="text-[13px] pl-5"
              style={{ borderLeft: "2px solid var(--line-strong)", color: "var(--fg-muted)" }}
            >
              &ldquo;Is this a copy, a derivative, or coincidence?&rdquo; has no deterministic answer.
              Perceptual hashes break the moment a counterfeiter redraws or mirrors the artwork, and
              two honest artists can land on the same idea. It is a judgment call — which is why it
              needs judges, not a function.
            </p>
          </RevealBlock>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
        <Stat
          label="Designs registered"
          value={<CountUp value={stats?.designs ?? 0} />}
          sub="each with an on-chain prior-art timestamp"
        />
        <Stat label="Claims filed" value={<CountUp value={stats?.claims ?? 0} />} sub="every one adjudicated in public" />
        <Stat
          label="Copies confirmed"
          value={<CountUp value={stats?.copies_confirmed ?? 0} />}
          sub="verdict COPY or DERIVATIVE"
        />
        <Stat
          label="Bounties escrowed"
          value={
            <>
              <CountUp value={Number(fromAtto(stats?.total_bounty_atto ?? "0", 2))} decimals={2} />
              <span style={{ fontSize: "0.4em", marginLeft: "0.35em", color: "var(--fg-muted)" }}>GEN</span>
            </>
          }
          sub={`${fromAtto(stats?.total_paid_atto ?? "0", 2)} GEN already paid out`}
        />
      </div>

      <div className="grid md:grid-cols-4 gap-px mt-24" style={{ background: "var(--line)" }}>
        {STEPS.map((step, i) => (
          <RevealBlock key={step.n} delay={i * 0.06}>
            <div className="p-6 h-full" style={{ background: "var(--bg)" }}>
              <div className="label">{step.n}</div>
              <h3 className="display mt-3" style={{ fontSize: "1.5rem" }}>
                {step.title}
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--fg-muted)" }}>
                {step.body}
              </p>
            </div>
          </RevealBlock>
        ))}
      </div>
    </section>
  );
}
