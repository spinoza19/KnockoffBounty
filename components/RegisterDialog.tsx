"use client";

import { useMemo, useState } from "react";
import type { SubmitInput, TrackedStatus } from "@genlayer/transaction-kit-react";
import { getContractAddress } from "@/lib/genlayer/client";
import { useWallet } from "@/lib/genlayer/wallet";
import { useRefreshAll } from "@/lib/hooks/useKnockoffBounty";
import { toAtto } from "@/lib/format";
import { error as toastError, success } from "@/lib/utils/toast";
import { Modal } from "./Modal";
import { TxRunner } from "./TxRunner";

const CATEGORIES = ["sticker", "wall decal", "apparel print", "enamel pin", "nursery print", "3d model", "pattern"];

const EMPTY = { title: "", category: CATEGORIES[0], description: "", image: "", bounty: "1" };

export function RegisterDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isConnected, isOnCorrectNetwork } = useWallet();
  const refresh = useRefreshAll();
  const contractAddress = getContractAddress();

  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState<"form" | "submit">("form");

  const set = (key: keyof typeof EMPTY) => (e: React.ChangeEvent<any>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const descriptionLength = form.description.trim().length;
  const problems: string[] = [];
  if (form.title.trim().length < 3) problems.push("Title needs at least 3 characters.");
  if (descriptionLength < 30)
    problems.push(`Description needs at least 30 characters (currently ${descriptionLength}).`);
  if (Number(form.bounty) < 0 || Number.isNaN(Number(form.bounty))) problems.push("Bounty must be a number.");

  const tx = useMemo<SubmitInput | null>(() => {
    if (!contractAddress) return null;
    return {
      kind: "write",
      address: contractAddress as `0x${string}`,
      method: "register_design",
      args: [form.title.trim(), form.category, form.description.trim(), form.image.trim()],
    };
  }, [contractAddress, form.title, form.category, form.description, form.image]);

  // `value` is not part of SubmitInput: the kit takes the payable amount
  // separately so it can show deposit and fee as two lines in the receipt.
  const bountyAtto = useMemo(() => toAtto(form.bounty || "0"), [form.bounty]);

  const close = () => {
    setForm(EMPTY);
    setStep("form");
    onClose();
  };

  const handleDone = (status: TrackedStatus) => {
    if (status.successful !== false) {
      refresh();
      success("Design registered", {
        description: "Its prior-art timestamp is now on-chain and the bounty is escrowed.",
      });
      close();
      return;
    }
    toastError("Registration did not settle", { description: "Nothing was charged beyond fees. Try again." });
    setStep("form");
  };

  return (
    <Modal open={open} onClose={close} eyebrow="Registry" title="Register a design">
      {step === "form" ? (
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isConnected) return toastError("Connect your wallet first");
            if (!isOnCorrectNetwork) return toastError("Switch to GenLayer Studio Next first");
            if (problems.length) return toastError(problems[0]);
            setStep("submit");
          }}
        >
          <div>
            <label className="label" htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className="field"
              value={form.title}
              onChange={set("title")}
              placeholder="Ancient Lamp, Cats &amp; Birds"
              maxLength={120}
            />
          </div>

          <div>
            <label className="label" htmlFor="category">
              Category
            </label>
            <select id="category" className="field" value={form.category} onChange={set("category")}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c} style={{ background: "var(--bg)", color: "var(--fg)" }}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description — this is the evidence
            </label>
            <textarea
              id="description"
              className="field"
              rows={5}
              value={form.description}
              onChange={set("description")}
              maxLength={1200}
              placeholder="Describe the elements, the composition, the palette, any lettering. Validators compare a listing against these words, so name the details that would not appear by coincidence."
            />
            <div className="flex justify-between mt-1">
              <span className="text-[11px]" style={{ color: "var(--fg-faint)" }}>
                Specific beats poetic. &ldquo;Three curls of steam&rdquo; is worth more than &ldquo;cosy vibe&rdquo;.
              </span>
              <span
                className="text-[11px]"
                style={{ color: descriptionLength < 30 ? "var(--verdict-copy)" : "var(--fg-faint)" }}
              >
                {descriptionLength}/1200
              </span>
            </div>
          </div>

          <div>
            <label className="label" htmlFor="image">
              Reference image URL (optional)
            </label>
            <input
              id="image"
              className="field"
              value={form.image}
              onChange={set("image")}
              placeholder="https://…"
              maxLength={400}
            />
          </div>

          <div>
            <label className="label" htmlFor="bounty">
              Bounty to escrow (GEN)
            </label>
            <input
              id="bounty"
              className="field"
              value={form.bounty}
              onChange={set("bounty")}
              inputMode="decimal"
              placeholder="1"
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--fg-faint)" }}>
              A confirmed copy releases 50% of the remaining pool to whoever found it; a derivative
              releases 20%. Register with zero and the record still stands — nobody is paid to hunt
              for you.
            </p>
          </div>

          {problems.length > 0 && (
            <ul className="text-[12px] flex flex-col gap-1" style={{ color: "var(--verdict-copy)" }}>
              {problems.map((p) => (
                <li key={p}>— {p}</li>
              ))}
            </ul>
          )}

          <button className="btn btn-solid" type="submit" disabled={problems.length > 0}>
            Review &amp; sign
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="text-[13px] flex flex-col gap-2">
            <div className="flex justify-between gap-6">
              <dt className="label">Title</dt>
              <dd className="text-right">{form.title}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="label">Category</dt>
              <dd className="text-right">{form.category}</dd>
            </div>
            <div className="flex justify-between gap-6">
              <dt className="label">Bounty</dt>
              <dd className="text-right">{form.bounty || "0"} GEN</dd>
            </div>
          </dl>
          <div className="rule" />
          <TxRunner
            tx={tx}
            userValue={bountyAtto}
            onDone={handleDone}
            note="Approve the fee, then sign. The transaction writes the registry entry and escrows the bounty in one call."
          />
          <button className="btn" onClick={() => setStep("form")}>
            Back to the form
          </button>
        </div>
      )}
    </Modal>
  );
}
