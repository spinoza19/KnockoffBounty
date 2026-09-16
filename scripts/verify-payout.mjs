import { readFileSync } from "node:fs";
import { getClient, getDeployer, fmtGen, read } from "./genlayer-node.mjs";

const account = getDeployer();
const client = getClient(account);
const GEN = 10n ** 18n;

const code = new Uint8Array(readFileSync("contracts/knockoff_bounty.py"));
const dfees = await client.estimateTransactionFees();
const dhash = await client.deployContract({ code, args: [], fees: dfees });
const dr = await client.waitForTransactionReceipt({ hash: dhash, waitUntil: "decided", retries: 300, interval: 3000 });
const addr = dr?.txDataDecoded?.contractAddress ?? dr?.to_address;
console.log("throwaway:", addr);

async function send(fn, args = [], value = 0n) {
  let fees;
  try {
    fees = await client.estimateTransactionFeesForWrite({ address: addr, functionName: fn, args, value });
  } catch { fees = await client.estimateTransactionFees(); }
  const h = await client.writeContract({ address: addr, functionName: fn, args, value, fees });
  const r = await client.waitForTransactionReceipt({ hash: h, waitUntil: "decided", retries: 400, interval: 3000 });
  return { h, r };
}

await send("register_design", ["Payout Path Check", "sticker",
  "A throwaway registry entry used only to verify that credited funds actually leave the contract.", ""], 4n * GEN);
await send("close_design", ["D1"]);
console.log("credit:", fmtGen(await read(client, addr, "get_credit", [account.address])));

const { h, r } = await send("withdraw");
console.log("withdraw:", r.txExecutionResultName, h);

const triggered = await client.getTriggeredTransactionIds({ hash: h });
console.log("triggered transfer tx:", JSON.stringify(triggered));

for (let i = 0; i <= 60; i += 1) {
  const bal = await client.getBalance({ address: addr });
  if (bal === 0n) { console.log(`\n✔ escrow drained after ~${i * 10}s`); process.exit(0); }
  if (i % 6 === 0) {
    let st = "?";
    try {
      const w = await client.getTransaction({ hash: h });
      st = `${w.statusName}`;
      if (triggered?.[0]) {
        const t = await client.getTransaction({ hash: triggered[0] });
        st += ` | transfer:${t.statusName}/${t.txExecutionResultName ?? "-"}`;
      }
    } catch {}
    console.log(`  t+${i * 10}s escrow ${fmtGen(bal)} | withdraw:${st}`);
  }
  await new Promise((res) => setTimeout(res, 10000));
}
console.log("\n✖ still not settled after 10 minutes");
