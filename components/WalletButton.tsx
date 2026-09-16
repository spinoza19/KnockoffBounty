"use client";

import { useState } from "react";
import { useWallet, formatAddress } from "@/lib/genlayer/wallet";
import { switchToGenLayerNetwork } from "@/lib/genlayer/client";
import { error as toastError, success } from "@/lib/utils/toast";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  const {
    address,
    isConnected,
    isLoading,
    isMetaMaskInstalled,
    isOnCorrectNetwork,
    connectWallet,
    disconnectWallet,
  } = useWallet();
  const [busy, setBusy] = useState(false);

  if (!isMetaMaskInstalled) {
    return (
      <a
        className="btn"
        href="https://metamask.io/download/"
        target="_blank"
        rel="noreferrer noopener"
      >
        Install MetaMask
      </a>
    );
  }

  if (isConnected && !isOnCorrectNetwork) {
    return (
      <button
        className="btn"
        style={{ color: "var(--verdict-copy)", borderColor: "currentColor" }}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await switchToGenLayerNetwork();
            success("Switched to GenLayer Studio Next");
          } catch (e: any) {
            toastError("Could not switch network", { description: e?.message });
          } finally {
            setBusy(false);
          }
        }}
      >
        Wrong network — switch
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <button
        className="btn"
        onClick={disconnectWallet}
        title={address}
        aria-label={`Connected as ${address}. Click to disconnect.`}
      >
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            background: "var(--verdict-independent)",
            display: "inline-block",
          }}
        />
        {compact ? formatAddress(address, 9) : formatAddress(address, 13)}
      </button>
    );
  }

  return (
    <button className="btn btn-solid" disabled={isLoading || busy} onClick={() => connectWallet().catch(() => {})}>
      {isLoading ? "…" : "Connect wallet"}
    </button>
  );
}
