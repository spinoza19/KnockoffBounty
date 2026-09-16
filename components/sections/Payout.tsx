"use client";

import { useWallet } from "@/lib/genlayer/wallet";
import { useReporterStats } from "@/lib/hooks/useKnockoffBounty";
import { gen } from "@/lib/format";

/**
 * Payouts are pull-based: the court credits a ledger, the recipient claims.
 *
 * `withdraw` is currently guarded in the contract. Studio Next allots a
 * transaction no message budget, so the transfer a withdrawal emits is recorded
 * on the receipt and never dispatched - at either stage, with or without a
 * hand-built allocation. Rather than offer a button that zeroes a balance the
 * caller cannot receive, the ledger is shown and the reason is stated.
 * `npm run verify:payout` reproduces the finding end to end.
 */
export function Payout() {
  const { address, isConnected } = useWallet();
  const { data: stats } = useReporterStats(address);

  const credit = BigInt(stats?.credit_atto ?? "0");

  if (!isConnected) return null;

  return (
    <section className="shell pb-24">
      <div className="card p-6 md:p-8 flex flex-col md:flex-row md:items-start gap-8 justify-between">
        <div>
          <div className="label">Your ledger</div>
          <div className="display mt-2" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
            {gen(stats?.credit_atto ?? "0", 4)}
          </div>
          <p className="text-[12px] mt-2" style={{ color: "var(--fg-muted)" }}>
            {stats?.upheld ?? 0} of {stats?.filed ?? 0} claims upheld
            {credit > 0n ? " · credited to you on-chain" : " · nothing outstanding"}
          </p>
        </div>

        <div className="md:w-[420px] w-full">
          {credit > 0n ? (
            <div className="p-4 text-[12px] leading-relaxed" style={{ border: "1px solid var(--line-strong)" }}>
              <div className="label" style={{ color: "var(--verdict-derivative)" }}>
                Claiming is paused on this network
              </div>
              <p className="mt-3" style={{ color: "var(--fg-muted)" }}>
                Studio Next allots a transaction no message budget, so a transfer out of the contract
                is written to the receipt and never dispatched — at either settlement stage. The
                contract therefore refuses to run <code>withdraw</code> rather than zero a balance you
                could not receive. Your credit is recorded on-chain and stays claimable.
              </p>
              <p className="mt-3" style={{ color: "var(--fg-faint)" }}>
                Reproduce it with <code>npm run verify:payout</code>.
              </p>
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: "var(--fg-faint)" }}>
              Find a knockoff and file it. Upheld claims credit your share of the design&apos;s bounty
              here, alongside your returned stake.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
