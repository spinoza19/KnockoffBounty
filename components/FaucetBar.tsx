"use client";

import { useWallet } from "@/lib/genlayer/wallet";
import { useBalance, useFaucet } from "@/lib/hooks/useBalance";
import { gen } from "@/lib/format";
import { error as toastError, success } from "@/lib/utils/toast";

/**
 * A visitor lands here with an empty Studio Next wallet and cannot pay the fee
 * to try anything. Rather than sending them away to find a faucet, offer it
 * where the problem appears.
 */
export function FaucetBar() {
  const { address, isConnected, isOnCorrectNetwork } = useWallet();
  const { data: balance } = useBalance(isConnected ? address : null);
  const { fund, pending } = useFaucet(address);

  if (!isConnected || !isOnCorrectNetwork) return null;

  const empty = (balance ?? 0n) < 10n ** 17n; // under 0.1 GEN cannot pay a fee

  return (
    <div
      className="shell py-3 flex flex-wrap items-center justify-between gap-4 no-print"
      style={{ borderBottom: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-6">
        <span className="label">Balance</span>
        <span className="text-[13px] tabular-nums">{gen(balance ?? 0n, 3)}</span>
        {empty && (
          <span className="text-[11px]" style={{ color: "var(--verdict-derivative)" }}>
            too low to cover a transaction fee
          </span>
        )}
      </div>

      <button
        className={empty ? "btn btn-solid" : "btn"}
        disabled={pending}
        onClick={() =>
          fund()
            .then(() => success("Test GEN sent", { description: "Studio Next faucet, testnet tokens only." }))
            .catch((e: any) =>
              toastError("Faucet unavailable", {
                description: e?.message ?? "This network may not expose a faucet.",
              }),
            )
        }
      >
        {pending ? "Sending…" : "Get 50 test GEN"}
      </button>
    </div>
  );
}
