"use client";

import {
  GenLayerTransactionPanel,
  type SubmitInput,
  type TrackedStatus,
} from "@genlayer/transaction-kit-react";
import { GENLAYER_NETWORK } from "@/lib/genlayer/client";
import { useTransactionKit } from "@/lib/genlayer/kit";
import { useWallet } from "@/lib/genlayer/wallet";
import { useTheme } from "@/lib/theme";

/**
 * Thin wrapper around the Transaction Kit panel so every write in the app gets
 * the same fee approval + status tracking flow, and the same failure copy.
 */
export function TxRunner({
  tx,
  userValue,
  onDone,
  note,
}: {
  tx: SubmitInput | null;
  /** Payable amount in atto-GEN. The kit charges it on top of the fee. */
  userValue?: bigint;
  onDone: (status: TrackedStatus) => void;
  note?: string;
}) {
  const { address } = useWallet();
  const kit = useTransactionKit(address);
  const { theme } = useTheme();

  if (!kit || !tx) {
    return (
      <p className="text-[12px]" style={{ color: "var(--verdict-copy)" }}>
        Wallet unavailable. Connect MetaMask on GenLayer Studio Next and try again.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {note && (
        <p className="text-[12px]" style={{ color: "var(--fg-muted)" }}>
          {note}
        </p>
      )}
      <div className="tx-surface">
        <GenLayerTransactionPanel
          kit={kit}
          tx={tx}
          userValue={userValue}
          network={GENLAYER_NETWORK.chainName}
          theme={theme}
          trackUntil="decided"
          onDone={onDone}
        />
      </div>
    </div>
  );
}
