"use client";

import { useMemo } from "react";
import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit-react";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useRefreshAll, useReporterStats } from "@/lib/hooks/useKnockoffBounty";
import { gen } from "@/lib/format";
import { success, error as toastError } from "@/lib/utils/toast";
import { TxRunner } from "../TxRunner";

/**
 * Payouts are pull-based: the court credits a ledger, the recipient withdraws.
 * Nothing is transferred inside the consensus path, so a slow or disagreeing
 * round can never strand value mid-transfer.
 */
export function Payout() {
  const { address, isConnected } = useWallet();
  const { data: stats } = useReporterStats(address);
  const refresh = useRefreshAll();
  const contractAddress = getContractAddress();

  const credit = BigInt(stats?.credit_atto ?? "0");

  const tx = useMemo<SubmitInput | null>(() => {
    if (!contractAddress) return null;
    return {
      kind: "write",
      address: contractAddress as `0x${string}`,
      method: "withdraw",
      args: [],
    };
  }, [contractAddress]);

  const handleDone = (status: TrackedStatus) => {
    refresh();
    if (status.successful !== false) {
      success("Withdrawal submitted", { description: "The transfer settles on finalization." });
      return;
    }
    toastError("Withdrawal did not settle", { description: "Your credit is untouched." });
  };

  if (!isConnected) return null;

  return (
    <section className="shell pb-24">
      <div className="card p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-8 justify-between">
        <div>
          <div className="label">Your ledger</div>
          <div className="display mt-2" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
            {gen(stats?.credit_atto ?? "0", 4)}
          </div>
          <p className="text-[12px] mt-2" style={{ color: "var(--fg-muted)" }}>
            {stats?.upheld ?? 0} of {stats?.filed ?? 0} claims upheld
            {credit > 0n ? " · ready to withdraw" : " · nothing outstanding"}
          </p>
        </div>

        <div className="md:w-[380px] w-full">
          {credit > 0n ? (
            <TxRunner tx={tx} onDone={handleDone} />
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
