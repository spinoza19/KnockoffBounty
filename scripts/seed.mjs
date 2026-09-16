/**
 * Seed the deployed contract with a demo registry and adjudicate two claims
 * against the SAME archived marketplace page - one that should be upheld and
 * one that should be thrown out. A court that only ever says "copy" proves
 * nothing, so the seed deliberately includes the negative case.
 *
 *   npm run seed
 */
import {
  ADJUDICATION_FEES,
  EXPLORER_URL,
  fmtGen,
  getClient,
  getContractAddress,
  getDeployer,
  read,
  write,
} from "./genlayer-node.mjs";

const GEN = (n) => BigInt(Math.round(n * 1000)) * 10n ** 15n;

// A real Internet Archive capture of an AliExpress wholesale sticker listing
// page. Several different storefronts on it resell one identical motif.
const EVIDENCE_ALIEXPRESS =
  "https://web.archive.org/web/20240101000000/https://www.aliexpress.com/w/wholesale-cat-sticker.html";

const DESIGNS = [
  {
    title: "Ancient Lamp, Cats & Birds",
    category: "wall decal",
    description:
      "Black silhouette wall decal: two cats sit on a cobbled ledge beneath an ornate wrought-iron street lamp that curves over them, with three small birds perched along the lamp arm and a scatter of leaves falling to the right. Single-colour vinyl cut, 33 x 60 cm, sold as a removable plane wall sticker.",
    image: "https://web.archive.org/web/20240101000000/https://www.aliexpress.com/w/wholesale-cat-sticker.html",
    bounty: 12,
  },
  {
    title: "Sleeping Fox in a Teacup",
    category: "sticker",
    description:
      "Hand-drawn line-art sticker of a sleeping red fox curled inside a chipped porcelain teacup, three curls of steam rising from the rim, hand-lettered caption 'nap o'clock' across the saucer, mustard and cream two-colour palette, die-cut matte vinyl.",
    image: "https://example.com/fox-teacup.png",
    bounty: 8,
  },
  {
    title: "Tide Pool Alphabet",
    category: "nursery print",
    description:
      "Educational nursery print: twenty-six hand-painted tide-pool creatures arranged in a 5x6 grid, each captioned with its letter in a rounded lowercase serif, muted sea-glass palette of teal, coral and sand, 50 x 70 cm giclee.",
    image: "https://example.com/tidepool.png",
    bounty: 5,
  },
];

const CLAIMS = [
  {
    design: 0,
    evidence: EVIDENCE_ALIEXPRESS,
    stake: 1,
    expect: "COPY or DERIVATIVE - the same lamp/cats/birds motif is resold by several storefronts on this page",
  },
  {
    design: 1,
    evidence: EVIDENCE_ALIEXPRESS,
    stake: 1,
    expect: "INDEPENDENT - nothing on this page resembles a fox in a teacup",
  },
];

const j = (v) => JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));

function leaderOf(receipt) {
  const cd = receipt?.consensus_data;
  return Array.isArray(cd?.leader_receipt) ? cd.leader_receipt[0] : cd?.leader_receipt;
}

function failure(receipt) {
  if (receipt?.txExecutionResultName === "FINISHED_WITH_RETURN") return null;
  const L = leaderOf(receipt);
  const stderr = (L?.genvm_result?.stderr ?? "").replace(/\\n/g, "\n");
  return (
    `${receipt?.txExecutionResultName ?? receipt?.statusName}: ` +
    (stderr.trim().split("\n").pop() || JSON.stringify(L?.result ?? {}).slice(0, 300))
  );
}

const account = getDeployer();
const client = getClient(account);
const address = getContractAddress();

console.log(`contract ${address}`);
console.log(`account  ${account.address}\n`);

const registered = [];
for (const design of DESIGNS) {
  process.stdout.write(`register  ${design.title.padEnd(28)} `);
  const { receipt } = await write(
    client,
    address,
    "register_design",
    [design.title, design.category, design.description, design.image],
    GEN(design.bounty),
  );
  const err = failure(receipt);
  if (err) {
    console.log(`✖ ${err}`);
    process.exit(1);
  }
  const designs = await read(client, address, "get_designs");
  const created = designs[designs.length - 1];
  registered.push(created);
  console.log(`✔ ${created.id}  bounty ${fmtGen(created.bounty_atto)}`);
}

console.log("");
const filedClaims = [];
for (const claim of CLAIMS) {
  const design = registered[claim.design];
  process.stdout.write(`claim     ${design.id} ${design.title.padEnd(24)} `);
  const { receipt } = await write(
    client,
    address,
    "file_claim",
    [design.id, claim.evidence],
    GEN(claim.stake),
  );
  const err = failure(receipt);
  if (err) {
    console.log(`✖ ${err}`);
    process.exit(1);
  }
  const claims = await read(client, address, "get_claims");
  const created = claims[claims.length - 1];
  filedClaims.push({ ...claim, id: created.id, design });
  console.log(`✔ ${created.id}  staked ${fmtGen(created.stake_atto)}`);
}

console.log("");
for (const claim of filedClaims) {
  process.stdout.write(`adjudicate ${claim.id} (${claim.design.title}) … `);
  const { hash, receipt } = await write(
    client,
    address,
    "adjudicate",
    [claim.id],
    0n,
    ADJUDICATION_FEES,
  );
  const err = failure(receipt);
  if (err) {
    console.log(`✖ ${err}`);
    continue;
  }
  const resolved = await read(client, address, "get_claim", [claim.id]);
  console.log(`✔ ${resolved.verdict}  score ${resolved.score}/${resolved.max_score}`);
  console.log(`   expected : ${claim.expect}`);
  console.log(`   listing  : ${resolved.listing_title || "-"} @ ${resolved.marketplace || "-"}`);
  console.log(`   factors  : ${j(resolved.factors)}  generic_trope=${resolved.generic_trope}`);
  console.log(`   rationale: ${resolved.rationale}`);
  console.log(`   payout   : ${fmtGen(resolved.payout_atto)}`);
  console.log(`   tx       : ${EXPLORER_URL}/tx/${hash}\n`);
}

console.log("stats:", j(await read(client, address, "get_stats")));
