/**
 * End-to-end check against the deployed contract on Studio Next:
 * register a design -> file a claim -> adjudicate -> read the verdict back.
 *
 *   node scripts/smoke.mjs "<archive url>"
 */
import {
  EXPLORER_URL,
  fmtGen,
  getClient,
  getContractAddress,
  getDeployer,
  read,
  write,
  ADJUDICATION_FEES,
} from "./genlayer-node.mjs";

const EVIDENCE = process.argv[2] ?? "https://archive.ph/2tfP7";
const GEN = (n) => BigInt(Math.round(n * 1000)) * 10n ** 15n;

const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x), 2);

function leaderOf(receipt) {
  const cd = receipt?.consensus_data;
  return Array.isArray(cd?.leader_receipt) ? cd.leader_receipt[0] : cd?.leader_receipt;
}

function explain(receipt) {
  const L = leaderOf(receipt);
  return {
    status: receipt?.statusName,
    execution: receipt?.txExecutionResultName,
    leader: L?.result?.payload ?? L?.result?.status ?? "-",
    stderr: (L?.genvm_result?.stderr ?? "").slice(0, 900),
  };
}

const account = getDeployer();
const client = getClient(account);
const address = getContractAddress();

console.log(`contract ${address}`);
console.log(`evidence ${EVIDENCE}\n`);

console.log("1/3  register_design (funding a 10 GEN bounty) …");
const reg = await write(
  client,
  address,
  "register_design",
  [
    "Sleeping Fox in a Teacup",
    "sticker",
    "A line-art sleeping red fox curled inside a chipped porcelain teacup, steam rising in three curls, hand-lettered caption 'nap o'clock' across the saucer, mustard and cream palette.",
    "https://example.com/fox.png",
  ],
  GEN(10),
);
console.log("     ", j(explain(reg.receipt)));

const designs = await read(client, address, "get_designs");
const design = designs[designs.length - 1];
console.log("     design:", design?.id, "| bounty", fmtGen(design?.bounty_atto ?? 0));

console.log("\n2/3  file_claim (staking 1 GEN) …");
const filed = await write(client, address, "file_claim", [design.id, EVIDENCE], GEN(1));
console.log("     ", j(explain(filed.receipt)));

const claims = await read(client, address, "get_claims");
const claim = claims[claims.length - 1];
console.log("     claim:", claim?.id, "| status", claim?.status);

console.log("\n3/3  adjudicate (web render + LLM + validator agreement) …");
const verdict = await write(client, address, "adjudicate", [claim.id], 0n, ADJUDICATION_FEES);
console.log("     ", j(explain(verdict.receipt)));
console.log(`     tx ${EXPLORER_URL}/tx/${verdict.hash}`);

const resolved = await read(client, address, "get_claim", [claim.id]);
console.log("\nRESOLVED CLAIM");
console.log(j(resolved));
console.log("\nSTATS");
console.log(j(await read(client, address, "get_stats")));
