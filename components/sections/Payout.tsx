"use client";

import { useMemo, useState } from "react";
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
  // After a withdrawal the ledger reads zero but the tokens are still clearing
  // the appeal window. Without this the card would look like the money vanished.
  const [inFlight, setInFlight] = useState<bigint | null>(null);

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
      setInFlight(credit);
      success("Withdrawal submitted", {
        description: "The transfer is queued and settles once the transaction finalizes.",
      });
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
          {inFlight !== null && credit === 0n && (
            <p className="text-[12px] mt-2" style={{ color: "var(--verdict-derivative)" }}>
              {gen(inFlight, 4)} withdrawn and queued — it reaches your wallet when the transaction
              finalizes.
            </p>
          )}
        </div>

        <div className="md:w-[380px] w-full">
          {credit > 0n ? (
            <TxRunner
              tx={tx}
              onDone={handleDone}
              note="The ledger is debited when this transaction is decided; the tokens move once it clears the appeal window, the same way an exit from an optimistic rollup does."
            />
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
