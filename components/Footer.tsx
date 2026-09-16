"use client";

import { EXPLORER_URL, getContractAddress } from "@/lib/genlayer/client";
import { GENLAYER_CHAIN } from "@/lib/genlayer/network";

export function Footer() {
  const contract = getContractAddress();

  return (
    <footer className="hairline-top no-print">
      <div className="shell py-12 grid md:grid-cols-4 gap-10">
        <div className="md:col-span-2">
          <div className="display" style={{ fontSize: "1.6rem" }}>
            KnockoffBounty
          </div>
          <p className="mt-3 max-w-[44ch] text-[12px]" style={{ color: "var(--fg-muted)" }}>
            A court for stolen designs, settled by decentralised judgment. Verdicts here are community
            adjudication and evidence — not a legal determination. They are built to be attached to a
            marketplace complaint, not to replace one.
          </p>
        </div>

        <div>
          <div className="label">Network</div>
          <ul className="mt-3 flex flex-col gap-1 text-[12px]">
            <li>{GENLAYER_CHAIN.name}</li>
            <li>Chain {GENLAYER_CHAIN.id}</li>
            <li style={{ color: "var(--fg-muted)" }}>{GENLAYER_CHAIN.rpcUrls.default.http[0]}</li>
          </ul>
        </div>

        <div>
          <div className="label">On chain</div>
          <ul className="mt-3 flex flex-col gap-1 text-[12px]">
            {contract && (
              <li>
                <a
                  className="link-underline"
                  href={`${EXPLORER_URL}/address/${contract}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Contract ↗
                </a>
              </li>
            )}
            <li>
              <a
                className="link-underline"
                href="https://docs.genlayer.com/"
                target="_blank"
                rel="noreferrer noopener"
              >
                GenLayer docs ↗
              </a>
            </li>
            <li>
              <a className="link-underline" href="/#rubric">
                The rubric
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="shell pb-10">
        <div className="rule mb-4" />
        <div className="label">Built for the GenLayer Agent Tank hackathon · 2026</div>
      </div>
    </footer>
  );
}
