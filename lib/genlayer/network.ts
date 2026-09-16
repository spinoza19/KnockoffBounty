import { studioDevnet } from "genlayer-js/chains";

/**
 * One network definition shared by MetaMask, genlayer-js and the Transaction
 * Kit. Keeping every consumer on the same object prevents an RPC override from
 * producing transactions signed for a different chain.
 *
 * Target: GenLayer Studio Next (Consensus v0.6), chain id 61997.
 */
export const DEFAULT_RPC_URL = "https://studio-next.genlayer.com/api";
export const DEFAULT_CHAIN_NAME = "GenLayer Studio Next";
export const DEFAULT_CHAIN_ID = 61997;
export const EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";

export interface GenLayerNetworkOverrides {
  chainId?: string;
  chainName?: string;
  rpcUrl?: string;
  symbol?: string;
}

function parseChainId(value: string | undefined): number {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_CHAIN_ID;
  }
  const chainId = Number(value);
  if (!Number.isSafeInteger(chainId) || chainId <= 0) {
    throw new Error(
      `NEXT_PUBLIC_GENLAYER_CHAIN_ID must be a positive integer; received ${value}`,
    );
  }
  return chainId;
}

export function createGenLayerNetworkConfig(
  overrides: GenLayerNetworkOverrides = {},
) {
  const chainId = parseChainId(overrides.chainId);
  const chainName = overrides.chainName || DEFAULT_CHAIN_NAME;
  const rpcUrl = overrides.rpcUrl || DEFAULT_RPC_URL;
  const symbol = overrides.symbol || "GEN";

  const chain = {
    ...studioDevnet,
    id: chainId,
    name: chainName,
    nativeCurrency: { name: symbol, symbol, decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } satisfies typeof studioDevnet;

  return {
    chain,
    wallet: {
      chainId: `0x${chainId.toString(16).toUpperCase()}`,
      chainName,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: [rpcUrl],
      blockExplorerUrls: [EXPLORER_URL],
    },
  };
}

const networkConfig = createGenLayerNetworkConfig({
  chainId: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID,
  chainName: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME,
  rpcUrl: process.env.NEXT_PUBLIC_GENLAYER_RPC_URL,
  symbol: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL,
});

export const GENLAYER_CHAIN = networkConfig.chain;
export const GENLAYER_NETWORK = networkConfig.wallet;
export const GENLAYER_CHAIN_ID = GENLAYER_CHAIN.id;
export const GENLAYER_CHAIN_ID_HEX = GENLAYER_NETWORK.chainId;
