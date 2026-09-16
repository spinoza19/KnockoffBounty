"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { archivedOn, archivedTarget, formatDateShort, gen, shortAddress } from "@/lib/format";
import { useClaims, useDesigns } from "@/lib/hooks/useKnockoffBounty";
import type { Claim } from "@/lib/contracts/types";
import { RevealBlock, RevealText } from "../Reveal";
import { AdjudicateDialog } from "../AdjudicateDialog";

type Filter = "all" | "PENDING" | "upheld" | "dismissed";

function state(claim: Claim) {
  if (claim.status === "PENDING") return "PENDING";
  return claim.verdict || "INSUFFICIENT_EVIDENCE";
}

export function Docket() {
  const { data: claims, isLoading } = useClaims();
  const { data: designs } = useDesigns();
  const [filter, setFilter] = useState<Filter>("all");
  const [adjudicating, setAdjudicating] = useState<Claim | null>(null);

  const designTitle = useMemo(() => {
    const map = new Map<string, string>();
    designs?.forEach((d) => map.set(d.id, d.title));
    return map;
  }, [designs]);

  const filtered = useMemo(() => {
    if (!claims) return [];
    const ordered = [...claims].reverse();
    if (filter === "all") return ordered;
    if (filter === "PENDING") return ordered.filter((c) => c.status === "PENDING");
    if (filter === "upheld")
      return ordered.filter((c) => c.verdict === "COPY" || c.verdict === "DERIVATIVE");
    return ordered.filter(
      (c) => c.verdict === "INDEPENDENT" || c.verdict === "INSUFFICIENT_EVIDENCE",
    );
  }, [claims, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "upheld", label: "Upheld" },
    { key: "dismissed", label: "Dismissed" },
  ];

  return (
    <section id="docket" className="shell py-24 md:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
        <div>
          <div className="label">03 — The docket</div>
          <RevealText as="h2" className="display mt-4" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
            Every claim, every verdict, in public
          </RevealText>
          <p className="mt-4 max-w-[54ch] text-[14px]" style={{ color: "var(--fg-muted)" }}>
            Including the ones that were thrown out. A court that only ever rules one way is not a
            court.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className="btn"
              style={
                filter === f.key
                  ? { background: "var(--fg)", color: "var(--bg)", borderColor: "var(--fg)" }
                  : undefined
              }
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="label">Reading the docket…</p>}

      {!isLoading && filtered.length === 0 && (
        <p className="text-[14px]" style={{ color: "var(--fg-muted)" }}>
          Nothing here yet.
        </p>
      )}

      <div className="flex flex-col">
        {filtered.map((claim, i) => {
          const verdict = state(claim);
          const target = archivedTarget(claim.evidence_url);
          const captured = archivedOn(claim.evidence_url);

          return (
            <RevealBlock key={claim.id} delay={Math.min(i, 5) * 0.04}>
              <div
                className="grid grid-cols-12 gap-4 items-center py-5"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <div className="col-span-6 md:col-span-4">
                  <div className="label">
                    {claim.id} → {claim.design_id}
                  </div>
                  <div className="display mt-1" style={{ fontSize: "1.3rem" }}>
                    {designTitle.get(claim.design_id) ?? claim.design_id}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
                    {target ? `vs ${target}` : "evidence snapshot"}
                    {captured ? ` · captured ${captured}` : ""}
                  </div>
                </div>

                <div className="col-span-6 md:col-span-3">
                  <div className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                    {claim.listing_title
                      ? claim.listing_title.length > 70
                        ? claim.listing_title.slice(0, 70) + "…"
                        : claim.listing_title
                      : "— listing not extracted yet —"}
                  </div>
                  <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
                    {claim.marketplace || "—"} · reporter {shortAddress(claim.reporter)}
                  </div>
                </div>

                <div className="col-span-4 md:col-span-2">
                  <span className={`verdict v-${verdict}`}>{verdict.replace(/_/g, " ")}</span>
                  {claim.status === "RESOLVED" && (
                    <div className="text-[11px] mt-2" style={{ color: "var(--fg-faint)" }}>
                      score {claim.score}/{claim.max_score}
                    </div>
                  )}
                </div>

                <div className="col-span-4 md:col-span-1 text-[12px]">
                  {Number(claim.payout_atto) > 0 ? gen(claim.payout_atto) : "—"}
                  <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
                    {formatDateShort(claim.resolved_at || claim.filed_at)}
                  </div>
                </div>

                <div className="col-span-4 md:col-span-2 flex justify-end gap-2">
                  {claim.status === "PENDING" ? (
                    <button className="btn" onClick={() => setAdjudicating(claim)}>
                      Adjudicate
                    </button>
                  ) : (
                    <Link className="btn" href={`/claim/${claim.id}`}>
                      Evidence pack
                    </Link>
                  )}
                </div>
              </div>
            </RevealBlock>
          );
        })}
        <div style={{ borderTop: "1px solid var(--line)" }} />
      </div>

      <AdjudicateDialog claim={adjudicating} onClose={() => setAdjudicating(null)} />
    </section>
  );
}
