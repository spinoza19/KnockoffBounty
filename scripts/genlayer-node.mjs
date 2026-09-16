// Shared node-side GenLayer client helpers used by deploy.mjs / seed.mjs.
// Kept plain ESM so the scripts run with bare `node` and no build step.
import { createAccount, createClient } from "genlayer-js";
import { studioDevnet } from "genlayer-js/chains";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ quiet: true });

export const RPC_URL =
  process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio-next.genlayer.com/api";
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || 61997);
export const CHAIN_NAME =
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME || "GenLayer Studio Next";
export const EXPLORER_URL = "https://explorer-studio-dev.genlayer.com";

export const chain = {
  ...studioDevnet,
  id: CHAIN_ID,
  name: CHAIN_NAME,
  rpcUrls: { default: { http: [RPC_URL] } },
};

export function getDeployer() {
  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY is missing. Copy .env.example to .env.local and set it.",
    );
  }
  const normalised = key.startsWith("0x") ? key : `0x${key}`;
  return createAccount(normalised);
}

export function getClient(account) {
  return createClient({ chain, account });
}

/**
 * Studio networks expose a faucet RPC. The amount is in wei and must be sent
 * as a decimal string - a JS number large enough to matter loses precision and
 * serialises to exponent form, which the node rejects.
 */
export async function tryFund(client, address, amountWei = 1000n * 10n ** 18n) {
  try {
    await client.request({
      method: "sim_fundAccount",
      params: [address, amountWei.toString()],
    });
    for (let i = 0; i < 20; i += 1) {
      const balance = await getBalance(client, address);
      if (balance >= amountWei) return true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    return true;
  } catch {
    return false;
  }
}

export async function ensureFunded(client, address, minWei = 5n * 10n ** 18n) {
  const balance = await getBalance(client, address);
  if (balance >= minWei) return balance;
  await tryFund(client, address, 1000n * 10n ** 18n);
  return getBalance(client, address);
}

export async function getBalance(client, address) {
  try {
    return await client.getBalance({ address });
  } catch {
    return 0n;
  }
}

export const fmtGen = (wei) => {
  const raw = BigInt(wei ?? 0);
  const neg = raw < 0n;
  const v = neg ? -raw : raw;
  const whole = v / 10n ** 18n;
  const frac = (v % 10n ** 18n).toString().padStart(18, "0").slice(0, 4);
  return `${neg ? "-" : ""}${whole}.${frac} GEN`;
};

export function receiptOk(receipt) {
  const numeric = Number(receipt?.status);
  return (
    numeric === 5 ||
    numeric === 7 ||
    receipt?.statusName === "ACCEPTED" ||
    receipt?.statusName === "FINALIZED"
  );
}

export function getContractAddress() {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is not set. Run `npm run deploy:contract` first.");
  }
  return address;
}

/**
 * Submit a write call with an accurate, simulated fee estimate.
 * Studio Next rejects transactions that carry no fee distribution.
 */
export async function write(client, address, functionName, args = [], value = 0n, feeOverrides) {
  let fees;
  try {
    fees = await client.estimateTransactionFeesForWrite({
      address,
      functionName,
      args,
      value,
      ...(feeOverrides ?? {}),
    });
  } catch {
    // Simulation can fail for methods that call out to the web/LLM; fall back
    // to a static estimate with the same (generous) allocations.
    fees = await client.estimateTransactionFees(feeOverrides);
  }

  const hash = await client.writeContract({
    address,
    functionName,
    args,
    value,
    fees,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash,
    waitUntil: "decided",
    retries: 400,
    interval: 3000,
  });

  return { hash, receipt, fees };
}

export async function read(client, address, functionName, args = []) {
  return client.readContract({ address, functionName, args });
}

/**
 * Adjudication renders a web page and runs an LLM on both the leader and every
 * validator, so it needs far more time units and execution budget than the
 * default profile a plain state write gets.
 */
export const ADJUDICATION_FEES = {
  leaderTimeunitsAllocation: 600,
  validatorTimeunitsAllocation: 600,
  executionBudgetPerRound: (10n ** 18n).toString(),
  priceCapHeadroomBps: 20000,
};
