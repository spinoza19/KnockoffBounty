"use client";

import { useMemo, useState } from "react";
import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit-react";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useRefreshAll } from "@/lib/hooks/useKnockoffBounty";
import { archivedOn, archivedTarget, isArchiveUrl, toAtto } from "@/lib/format";
import { SAMPLE_EVIDENCE } from "@/lib/constants";
import { error as toastError, success } from "@/lib/utils/toast";
import type { Design } from "@/lib/contracts/types";
import { Modal } from "./Modal";
import { TxRunner } from "./TxRunner";

export function FileClaimDialog({
  design,
  onClose,
}: {
  design: Design | null;
  onClose: () => void;
}) {
  const { isConnected, isOnCorrectNetwork } = useWallet();
  const refresh = useRefreshAll();
  const contractAddress = getContractAddress();

  const [evidence, setEvidence] = useState("");
  const [stake, setStake] = useState("0.5");
  const [step, setStep] = useState<"form" | "submit">("form");

  const valid = isArchiveUrl(evidence);
  const target = archivedTarget(evidence);
  const capturedOn = archivedOn(evidence);

  const tx = useMemo<SubmitInput | null>(() => {
    if (!contractAddress || !design) return null;
    return {
      kind: "write",
      address: contractAddress as `0x${string}`,
      method: "file_claim",
      args: [design.id, evidence.trim()],
    };
  }, [contractAddress, design, evidence]);

  const stakeAtto = useMemo(() => toAtto(stake || "0"), [stake]);

  const close = () => {
    setEvidence("");
    setStake("0.5");
    setStep("form");
    onClose();
  };

  const handleDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      refresh();
      success("Claim filed", {
        description: "It is on the docket as PENDING. Anyone can now push it through the court.",
      });
      close();
      return;
    }
    toastError("Claim did not settle", { description: "Your stake was not taken. Try again." });
    setStep("form");
  };

  return (
    <Modal
      open={!!design}
      onClose={close}
      eyebrow={design ? `${design.id} · ${design.title}` : "Claim"}
      title="Report a copy"
    >
      {step === "form" ? (
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isConnected) return toastError("Connect your wallet first");
            if (!isOnCorrectNetwork) return toastError("Switch to GenLayer Studio Next first");
            if (!valid) return toastError("Evidence must be an archive snapshot");
            setStep("submit");
          }}
        >
          <div
            className="p-4 text-[12px] leading-relaxed"
            style={{ border: "1px solid var(--line)", color: "var(--fg-muted)" }}
          >
            <strong style={{ color: "var(--fg)" }}>Why an archive link, not the listing itself.</strong>{" "}
            Validators each re-fetch the evidence independently, minutes apart, from different
            machines. A live marketplace page is geo-targeted, JavaScript-rendered, bot-blocked, and
            editable by the very seller under review — two honest validators would read two different
            pages and never agree. A frozen capture also proves the listing existed on a date you did
            not choose.
          </div>

          <div>
            <label className="label" htmlFor="evidence">
              Evidence — archive snapshot URL
            </label>
            <input
              id="evidence"
              className="field"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="https://web.archive.org/web/…/https://www.example-marketplace.com/item/…"
              maxLength={600}
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              {evidence && !valid && (
                <span style={{ color: "var(--verdict-copy)" }}>
                  Not admissible. Accepted: web.archive.org, archive.ph, archive.today.
                </span>
              )}
              {valid && (
                <span style={{ color: "var(--verdict-independent)" }}>
                  Admissible{target ? ` · captures ${target}` : ""}
                  {capturedOn ? ` · ${capturedOn}` : ""}
                </span>
              )}
              <button
                type="button"
                className="link-underline"
                style={{ color: "var(--fg-faint)" }}
                onClick={() => setEvidence(SAMPLE_EVIDENCE)}
              >
                use the demo snapshot
              </button>
              <a
                className="link-underline"
                style={{ color: "var(--fg-faint)" }}
                href="https://web.archive.org/save"
                target="_blank"
                rel="noreferrer noopener"
              >
                capture a page now ↗
              </a>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="stake">
              Stake (GEN)
            </label>
            <input
              id="stake"
              className="field"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              inputMode="decimal"
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
              Returned with your share of the bounty if the claim is upheld. Forfeited to the
              design&apos;s pool if the court rules the work independent — a wrong accusation should
              not be free. Returned in full if the snapshot turns out to be unreadable.
            </p>
          </div>

          <button className="btn btn-solid" type="submit" disabled={!valid}>
            Review &amp; sign
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="text-[13px] flex flex-col gap-2">
            <div className="flex justify-between gap-6">
              <dt className="label">Design</dt>
              <dd className="text-right">
                {design?.id} — {design?.title}
              </dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="label">Stake</dt>
              <dd className="text-right">{stake || "0"} GEN</dd>
            </div>
          </dl>
          <p className="text-[11px] break-all" style={{ color: "var(--fg-faint)" }}>
            {evidence}
          </p>
          <div className="rule" />
          <TxRunner
            tx={tx}
            userValue={stakeAtto}
            onDone={handleDone}
            note="Filing only records the claim and escrows your stake. Adjudication is a separate call, so a failed fetch can never burn the claim."
          />
          <button className="btn" onClick={() => setStep("form")}>
            Back
          </button>
        </div>
      )}
    </Modal>
  );
}
