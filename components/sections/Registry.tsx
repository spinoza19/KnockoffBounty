"use client";

import { useState } from "react";
import { gen, formatDateShort, shortAddress } from "@/lib/format";
import { useDesigns } from "@/lib/hooks/useKnockoffBounty";
import { useWallet } from "@/lib/genlayer/wallet";
import type { Design } from "@/lib/contracts/types";
import { RevealBlock, RevealText } from "../Reveal";
import { RegisterDialog } from "../RegisterDialog";
import { FileClaimDialog } from "../FileClaimDialog";

function DesignCard({ design, onReport }: { design: Design; onReport: (d: Design) => void }) {
  const { address } = useWallet();
  const mine = address && design.owner.toLowerCase() === address.toLowerCase();

  return (
    <article className="card p-6 flex flex-col gap-5 h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="label">{design.id} · {design.category}</div>
        {mine && (
          <span className="label" style={{ color: "var(--fg)" }}>
            yours
          </span>
        )}
      </div>

      <h3 className="display" style={{ fontSize: "clamp(1.5rem, 2.4vw, 2.1rem)" }}>
        {design.title}
      </h3>

      <p className="text-[13px] leading-relaxed" style={{ color: "var(--fg-muted)" }}>
        {design.description.length > 220
          ? design.description.slice(0, 220).trimEnd() + "…"
          : design.description}
      </p>

      <div className="mt-auto flex flex-col gap-4">
        <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
          <div>
            <div className="label">Bounty</div>
            <div className="text-[13px] mt-1">{gen(design.bounty_atto)}</div>
          </div>
          <div>
            <div className="label">Claims</div>
            <div className="text-[13px] mt-1">{design.claims_filed}</div>
          </div>
          <div>
            <div className="label">Confirmed</div>
            <div
              className="text-[13px] mt-1"
              style={{ color: design.copies_confirmed > 0 ? "var(--verdict-copy)" : undefined }}
            >
              {design.copies_confirmed}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
            {shortAddress(design.owner)} · {formatDateShort(design.registered_at)}
          </div>
          <button className="btn" onClick={() => onReport(design)} disabled={!design.is_open}>
            {design.is_open ? "Report a copy" : "Closed"}
          </button>
        </div>
      </div>
    </article>
  );
}

export function Registry() {
  const { data: designs, isLoading, isError } = useDesigns();
  const [registerOpen, setRegisterOpen] = useState(false);
  const [target, setTarget] = useState<Design | null>(null);

  return (
    <section id="registry" className="shell py-24 md:py-32">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-12">
        <div>
          <div className="label">02 — The registry</div>
          <RevealText as="h2" className="display mt-4" style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}>
            Prior art, timestamped
          </RevealText>
          <p className="mt-4 max-w-[52ch] text-[14px]" style={{ color: "var(--fg-muted)" }}>
            Every entry is a public record of what was made and when. Anyone can back a designer&apos;s
            bounty; nobody can quietly edit an entry after the fact.
          </p>
        </div>
        <button className="btn btn-solid" onClick={() => setRegisterOpen(true)}>
          Register a design
        </button>
      </div>

      {isLoading && <p className="label">Reading the registry from chain…</p>}

      {isError && (
        <p className="text-[13px]" style={{ color: "var(--verdict-copy)" }}>
          Could not reach the contract. Check that NEXT_PUBLIC_CONTRACT_ADDRESS points at a deployed
          KnockoffBounty on Studio Next.
        </p>
      )}

      {designs && designs.length === 0 && (
        <p className="text-[14px]" style={{ color: "var(--fg-muted)" }}>
          The registry is empty. Be the first entry.
        </p>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {designs?.map((design, i) => (
          <RevealBlock key={design.id} delay={(i % 3) * 0.06}>
            <DesignCard design={design} onReport={setTarget} />
          </RevealBlock>
        ))}
      </div>

      <RegisterDialog open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <FileClaimDialog design={target} onClose={() => setTarget(null)} />
    </section>
  );
}
