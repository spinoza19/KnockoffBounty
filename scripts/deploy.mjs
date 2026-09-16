/**
 * Deploy contracts/knockoff_bounty.py to GenLayer Studio Next and write the
 * resulting address into .env.local.
 *
 *   npm run deploy:contract
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  CHAIN_ID,
  CHAIN_NAME,
  EXPLORER_URL,
  RPC_URL,
  ensureFunded,
  fmtGen,
  getClient,
  getDeployer,
  receiptOk,
} from "./genlayer-node.mjs";

const CONTRACT_PATH = path.resolve(process.cwd(), "contracts/knockoff_bounty.py");
const ENV_FILE = path.resolve(process.cwd(), ".env.local");

function upsertEnv(key, value) {
  let contents = existsSync(ENV_FILE) ? readFileSync(ENV_FILE, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  contents = pattern.test(contents)
    ? contents.replace(pattern, line)
    : `${contents.trimEnd()}\n${line}\n`;
  writeFileSync(ENV_FILE, contents.startsWith("\n") ? contents.slice(1) : contents);
}

async function main() {
  const account = getDeployer();
  const client = getClient(account);

  console.log("─".repeat(64));
  console.log("  KnockoffBounty · deploy");
  console.log("─".repeat(64));
  console.log(`  network   ${CHAIN_NAME} (chain ${CHAIN_ID})`);
  console.log(`  rpc       ${RPC_URL}`);
  console.log(`  deployer  ${account.address}`);

  const balance = await ensureFunded(client, account.address);
  console.log(`  balance   ${fmtGen(balance)}`);
  if (balance === 0n) {
    throw new Error("Deployer has no funds and the faucet did not respond.");
  }

  const code = new Uint8Array(readFileSync(CONTRACT_PATH));
  console.log(`  contract  ${path.relative(process.cwd(), CONTRACT_PATH)} (${code.length} bytes)`);

  // Studio Next charges fees; a transaction submitted without a fee
  // distribution is rejected with FeeValueMustBeNonZero.
  const fees = await client.estimateTransactionFees();
  console.log(`  fee       ${fmtGen(fees.feeValue)}`);
  console.log("\n  deploying …");

  const hash = await client.deployContract({ code, args: [], fees });
  console.log(`  tx        ${hash}`);

  const receipt = await client.waitForTransactionReceipt({
    hash,
    waitUntil: "decided",
    retries: 300,
    interval: 3000,
  });

  if (!receiptOk(receipt)) {
    console.error(JSON.stringify(receipt, null, 2).slice(0, 4000));
    throw new Error(`Deployment was not accepted (status ${receipt?.statusName ?? receipt?.status}).`);
  }

  const address =
    receipt?.txDataDecoded?.contractAddress ?? receipt?.to_address ?? receipt?.data?.contract_address;
  if (!address) {
    console.error(JSON.stringify(receipt, null, 2).slice(0, 4000));
    throw new Error("Receipt did not contain a contract address.");
  }

  upsertEnv("NEXT_PUBLIC_CONTRACT_ADDRESS", address);

  console.log("\n  ✔ deployed");
  console.log(`  address   ${address}`);
  console.log(`  explorer  ${EXPLORER_URL}/tx/${hash}`);
  console.log("  .env.local updated with NEXT_PUBLIC_CONTRACT_ADDRESS");
  console.log("─".repeat(64));
}

main().catch((err) => {
  console.error("\n  ✖ deploy failed:", err?.message ?? err);
  process.exit(1);
});
