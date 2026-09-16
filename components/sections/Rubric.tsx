"use client";

import { FACTOR_KEYS, FACTOR_LABELS, FACTOR_QUESTIONS } from "@/lib/contracts/types";
import { useRubric } from "@/lib/hooks/useKnockoffBounty";
import { RevealBlock, RevealText } from "../Reveal";

const RATINGS = ["MATCH", "PARTIAL", "DIFFERENT"] as const;

export function Rubric() {
  const { data: rubric } = useRubric();

  return (
    <section id="rubric" className="shell py-24 md:py-32">
      <div className="grid md:grid-cols-12 gap-10 md:gap-16">
        <div className="md:col-span-5">
          <div className="label">04 — The law of this court</div>
          <RevealText as="h2" className="display mt-4" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
            The rubric is on-chain
          </RevealText>
          <div className="mt-6 flex flex-col gap-4 text-[14px] leading-relaxed">
            <RevealText as="p">
              These numbers are not in a config file we can quietly change. They are constants in the
              deployed contract, readable by anyone, identical for every claim. The table below is
              fetched live from it.
            </RevealText>
            <RevealText as="p" className="max-w-[46ch]">
              The model never picks the verdict. It rates four factors from the evidence; the contract
              adds the weights in ordinary Python and applies the thresholds. That split is what lets a
              validator disagree with a leader on the thing that matters.
            </RevealText>
          </div>
        </div>

        <div className="md:col-span-7">
          <RevealBlock>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th className="label text-left pb-3">Factor</th>
                    {RATINGS.map((r) => (
                      <th key={r} className="label text-right pb-3 pl-4">
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FACTOR_KEYS.map((key) => (
                    <tr key={key} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="py-4 pr-4">
                        <div>{FACTOR_LABELS[key]}</div>
                        <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
                          {FACTOR_QUESTIONS[key]}
                        </div>
                      </td>
                      {RATINGS.map((rating) => (
                        <td key={rating} className="py-4 pl-4 text-right tabular-nums">
                          {rubric ? `+${rubric.factor_weights?.[key]?.[rating] ?? 0}` : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="py-4 pr-4">
                      <div>Generic trope</div>
                      <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
                        Could two creators reach this independently?
                      </div>
                    </td>
                    <td colSpan={3} className="py-4 pl-4 text-right tabular-nums">
                      {rubric ? `−${rubric.generic_trope_penalty}` : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </RevealBlock>

          <RevealBlock delay={0.08}>
            <div className="grid sm:grid-cols-3 gap-px mt-10" style={{ background: "var(--line)" }}>
              {[
                {
                  label: "Copy",
                  cls: "v-COPY",
                  rule: rubric ? `score ≥ ${rubric.thresholds.COPY}` : "—",
                  pay: rubric ? `${(rubric.payout_bps.COPY ?? 0) / 100}% of the pool` : "—",
                },
                {
                  label: "Derivative",
                  cls: "v-DERIVATIVE",
                  rule: rubric ? `score ≥ ${rubric.thresholds.DERIVATIVE}` : "—",
                  pay: rubric ? `${(rubric.payout_bps.DERIVATIVE ?? 0) / 100}% of the pool` : "—",
                },
                {
                  label: "Independent",
                  cls: "v-INDEPENDENT",
                  rule: rubric ? `score < ${rubric.thresholds.DERIVATIVE}` : "—",
                  pay: "stake moves to the pool",
                },
              ].map((tier) => (
                <div key={tier.label} className="p-5" style={{ background: "var(--bg)" }}>
                  <span className={`verdict ${tier.cls}`}>{tier.label}</span>
                  <div className="mt-4 text-[13px] tabular-nums">{tier.rule}</div>
                  <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
                    {tier.pay}
                  </div>
                </div>
              ))}
            </div>
          </RevealBlock>

          <RevealBlock delay={0.12}>
            <div className="mt-10">
              <div className="label">Admissible evidence</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {(rubric?.admissible_evidence ?? []).map((host) => (
                  <span
                    key={host}
                    className="text-[11px] px-2 py-1"
                    style={{ border: "1px solid var(--line)", color: "var(--fg-muted)" }}
                  >
                    {host}
                  </span>
                ))}
              </div>
              <p className="text-[12px] mt-4 max-w-[60ch]" style={{ color: "var(--fg-faint)" }}>
                Anything else is rejected at filing time, before it costs anyone an adjudication.
              </p>
            </div>
          </RevealBlock>
        </div>
      </div>
    </section>
  );
}
