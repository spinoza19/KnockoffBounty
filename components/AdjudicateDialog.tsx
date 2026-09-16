"use client";

import { useMemo } from "react";
import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit-react";
import { getContractAddress } from "@/lib/genlayer/client";
import { useRefreshAll } from "@/lib/hooks/useKnockoffBounty";
import { success, error as toastError } from "@/lib/utils/toast";
import type { Claim } from "@/lib/contracts/types";
import { Modal } from "./Modal";
import { TxRunner } from "./TxRunner";

const STAGES = [
  "Every validator fetches the same archived snapshot",
  "Each rates the four rubric factors independently",
  "The contract derives the verdict from the ratings, in Python",
  "The round settles only if the derived verdicts agree",
];

export function AdjudicateDialog({
  claim,
  onClose,
}: {
  claim: Claim | null;
  onClose: () => void;
}) {
  const contractAddress = getContractAddress();
  const refresh = useRefreshAll();

  const tx = useMemo<SubmitInput | null>(() => {
    if (!contractAddress || !claim) return null;
    return {
      kind: "write",
      address: contractAddress as `0x${string}`,
      method: "adjudicate",
      args: [claim.id],
    };
  }, [contractAddress, claim]);

  const handleDone = (status: TrackedStatus) => {
    refresh();
    if (status.successful !== false) {
      success("Verdict recorded", { description: "Open the evidence pack to read the reasoning." });
      onClose();
      return;
    }
    toastError("The round did not settle", {
      description:
        "Validators timed out or disagreed. The claim is untouched and still PENDING — run it again.",
    });
  };

  return (
    <Modal
      open={!!claim}
      onClose={onClose}
      eyebrow={claim ? `${claim.id} · against ${claim.design_id}` : "Court"}
      title="Send it to the court"
    >
      <div className="flex flex-col gap-6">
        <ol className="flex flex-col gap-3">
          {STAGES.map((stage, i) => (
            <li key={stage} className="flex gap-4 text-[13px]">
              <span className="label" style={{ minWidth: "1.5rem" }}>
                0{i + 1}
              </span>
              <span style={{ color: "var(--fg-muted)" }}>{stage}</span>
            </li>
          ))}
        </ol>

        <p className="text-[12px]" style={{ color: "var(--fg-faint)" }}>
          This is the expensive call: a web render plus a model run, repeated on every validator. It
          takes around a minute. Anyone can pay for it — the outcome does not depend on who asks.
        </p>

        <div className="rule" />

        <TxRunner tx={tx} onDone={handleDone} />
      </div>
    </Modal>
  );
}
