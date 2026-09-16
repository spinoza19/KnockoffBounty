"use client";

import { useQuery } from "@tanstack/react-query";
import { EXPLORER_URL, getContractAddress } from "@/lib/genlayer/client";
import { useClaim, useContract, useRubric } from "@/lib/hooks/useKnockoffBounty";
import {
  archivedOn,
  archivedTarget,
  formatDate,
  gen,
} from "@/lib/format";
import { FACTOR_KEYS, FACTOR_LABELS, type FactorRating } from "@/lib/contracts/types";
import { VERDICT_COPY } from "@/lib/constants";

const RATING_TONE: Record<FactorRating, string> = {
  MATCH: "var(--verdict-copy)",
  PARTIAL: "var(--verdict-derivative)",
  DIFFERENT: "var(--fg-muted)",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-6 py-3"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="label">{label}</div>
      <div className="text-[13px] break-words">{children}</div>
    </div>
  );
}

export function EvidencePack({ claimId }: { claimId: string }) {
  const contract = useContract();
  const contractAddress = getContractAddress();
  const { data: claim, isLoading, isError } = useClaim(claimId);
  const { data: rubric } = useRubric();

  const { data: design } = useQuery({
    queryKey: ["design", claim?.design_id],
    queryFn: () => contract!.getDesign(claim!.design_id),
    enabled: !!contract && !!claim?.design_id,
  });

  if (isLoading) return <p className="label mt-10">Loading the record…</p>;
  if (isError || !claim)
    return (
      <p className="mt-10 text-[14px]" style={{ color: "var(--verdict-copy)" }}>
        No claim {claimId} on this contract.
      </p>
    );

  const verdict = claim.status === "PENDING" ? "PENDING" : claim.verdict || "INSUFFICIENT_EVIDENCE";
  const copy = VERDICT_COPY[verdict] ?? VERDICT_COPY.PENDING;
  const target = archivedTarget(claim.evidence_url);
  const captured = archivedOn(claim.evidence_url);

  return (
    <article className="mt-8">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <div className="label">Evidence pack · {claim.id}</div>
          <h1 className="display mt-3" style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)" }}>
            {design?.title ?? claim.design_id}
          </h1>
          <p className="mt-3 max-w-[54ch] text-[13px]" style={{ color: "var(--fg-muted)" }}>
            {copy.blurb}
          </p>
        </div>

        <div className="text-right">
          <span className={`verdict v-${verdict}`} style={{ fontSize: "12px", padding: "0.5rem 0.9rem" }}>
            {verdict.replace(/_/g, " ")}
          </span>
          {claim.status === "RESOLVED" && (
            <div className="display mt-3" style={{ fontSize: "2.4rem" }}>
              {claim.score}
              <span style={{ color: "var(--fg-muted)" }}>/{claim.max_score}</span>
            </div>
          )}
          <button className="btn mt-3 no-print" onClick={() => window.print()}>
            Print / save PDF
          </button>
        </div>
      </header>

      {/* --- what the court compared ---------------------------------------- */}
      <section className="mt-14 grid md:grid-cols-2 gap-px" style={{ background: "var(--line)" }}>
        <div className="p-6" style={{ background: "var(--bg)" }}>
          <div className="label">The registered design</div>
          <h2 className="display mt-2" style={{ fontSize: "1.5rem" }}>
            {design?.title ?? "—"}
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed" style={{ color: "var(--fg-muted)" }}>
            {design?.description ?? "—"}
          </p>
          <div className="label mt-5">Prior art recorded</div>
          <div className="text-[13px] mt-1">{formatDate(design?.registered_at)}</div>
        </div>

        <div className="p-6" style={{ background: "var(--bg)" }}>
          <div className="label">The listing under review</div>
          <h2 className="display mt-2" style={{ fontSize: "1.5rem" }}>
            {claim.listing_title || "— not extracted —"}
          </h2>
          <p className="mt-3 text-[13px]" style={{ color: "var(--fg-muted)" }}>
            {[claim.marketplace, claim.listing_seller, claim.listing_price]
              .filter(Boolean)
              .join(" · ") || "—"}
          </p>
          <div className="label mt-5">Snapshot</div>
          <a
            className="text-[12px] mt-1 block link-underline break-all"
            href={claim.evidence_url}
            target="_blank"
            rel="noreferrer noopener"
          >
            {claim.evidence_url}
          </a>
          <div className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
            {target ? `captures ${target}` : ""}
            {captured ? ` · ${captured}` : ""}
          </div>
        </div>
      </section>

      {/* --- the ratings ---------------------------------------------------- */}
      <section className="mt-14">
        <div className="label">How the score was reached</div>
        <div className="mt-4">
          {FACTOR_KEYS.map((key) => {
            const rating = (claim.factors?.[key] ?? "DIFFERENT") as FactorRating;
            const weight = rubric?.factor_weights?.[key]?.[rating] ?? 0;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-6 py-4"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <div className="text-[13px]">{FACTOR_LABELS[key]}</div>
                <div className="flex items-center gap-6">
                  <span className="text-[12px]" style={{ color: RATING_TONE[rating] }}>
                    {rating}
                  </span>
                  <span className="text-[13px] tabular-nums" style={{ minWidth: "2.5rem", textAlign: "right" }}>
                    +{weight}
                  </span>
                </div>
              </div>
            );
          })}
          <div
            className="flex items-center justify-between gap-6 py-4"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <div className="text-[13px]">
              Generic trope
              <span className="text-[11px] ml-2" style={{ color: "var(--fg-faint)" }}>
                reachable independently?
              </span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
                {claim.generic_trope || "—"}
              </span>
              <span className="text-[13px] tabular-nums" style={{ minWidth: "2.5rem", textAlign: "right" }}>
                {claim.generic_trope === "YES" ? `−${rubric?.generic_trope_penalty ?? 3}` : "0"}
              </span>
            </div>
          </div>
          <div
            className="flex items-center justify-between gap-6 py-4"
            style={{ borderTop: "1px solid var(--line-strong)" }}
          >
            <div className="display" style={{ fontSize: "1.3rem" }}>
              Total
            </div>
            <div className="display tabular-nums" style={{ fontSize: "1.3rem" }}>
              {claim.score}/{claim.max_score}
            </div>
          </div>
        </div>

        {claim.rationale && (
          <p
            className="mt-8 text-[14px] leading-relaxed pl-5 max-w-[70ch]"
            style={{ borderLeft: "2px solid var(--line-strong)" }}
          >
            {claim.rationale}
          </p>
        )}
      </section>

      {/* --- provenance ----------------------------------------------------- */}
      <section className="mt-14">
        <div className="label mb-2">Provenance</div>
        <Row label="Claim">{claim.id}</Row>
        <Row label="Design">
          {claim.design_id} — {design?.title ?? "—"}
        </Row>
        <Row label="Reporter">{claim.reporter}</Row>
        <Row label="Design owner">{design?.owner ?? "—"}</Row>
        <Row label="Filed">{formatDate(claim.filed_at)}</Row>
        <Row label="Ruled">{formatDate(claim.resolved_at)}</Row>
        <Row label="Stake">{gen(claim.stake_atto, 4)}</Row>
        <Row label="Payout">{gen(claim.payout_atto, 4)}</Row>
        <Row label="Contract">
          <a
            className="link-underline"
            href={`${EXPLORER_URL}/address/${contractAddress}`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {contractAddress}
          </a>
        </Row>
        <div style={{ borderTop: "1px solid var(--line)" }} />
      </section>

      <section className="mt-14 p-6" style={{ border: "1px solid var(--line-strong)" }}>
        <div className="label">How to use this</div>
        <p className="mt-3 text-[13px] leading-relaxed max-w-[70ch]" style={{ color: "var(--fg-muted)" }}>
          Attach this page to the marketplace&apos;s IP complaint form. It carries the three things a
          complaint normally cannot supply on its own: a prior-art timestamp you did not issue
          yourself, a frozen capture of the listing that survives its removal, and a reasoned ruling
          from parties with no stake in either side — all of it re-checkable against the contract on
          the block explorer.
        </p>
        <p className="mt-3 text-[12px]" style={{ color: "var(--fg-faint)" }}>
          This is community adjudication and evidence, not a legal determination.
        </p>
      </section>
    </article>
  );
}
