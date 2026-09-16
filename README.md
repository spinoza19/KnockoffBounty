# KnockoffBounty

**A court for stolen designs.** An on-chain design registry and counterfeit adjudication court,
built as an Intelligent Contract on **GenLayer Studio Next**.

A designer registers what they made and escrows a bounty. Anyone who finds that design resold on a
marketplace files a claim with a frozen archive snapshot and a stake. Validators independently fetch
the same evidence, rate it against a rubric published on-chain, and must agree before a single token
moves. What the designer walks away with is not the payout — it is a timestamped, independently
reasoned **evidence pack** they can attach to a takedown request.

| | |
|---|---|
| **Network** | GenLayer Studio Next (Consensus v0.6) |
| **Chain ID** | `61997` |
| **RPC** | `https://studio-next.genlayer.com/api` |
| **Contract** | [`0xe9B2F2Ea38C88179929FcA211c51C25ca607EE17`](https://explorer-studio-dev.genlayer.com/address/0xe9B2F2Ea38C88179929FcA211c51C25ca607EE17) |
| **Track** | Onchain Justice |
| **Contract source** | [`contracts/knockoff_bounty.py`](contracts/knockoff_bounty.py) |

---

## The problem

You sell a design. Six weeks later it is on AliExpress or Temu at a fifth of the price. You file an
IP complaint and it is refused, because a complaint is only an assertion — and the only party in a
position to rule on it is the marketplace, which earns commission on every counterfeit sale.

Large brands answer this with registries, lawyers and enforcement teams. Somebody shipping forty
pieces a month has none of that.

## Why this needs decentralised judgment, not just AI

> "Is this listing a copy of that design, a derivative, or coincidence?"

Three properties make this a consensus problem rather than a backend problem:

1. **No deterministic answer exists.** Perceptual hashes break the moment a counterfeiter redraws,
   mirrors or recolours the artwork. And two honest artists genuinely can arrive at the same idea.
2. **Every available judge is a party to the dispute.** The marketplace profits from the listing.
   The designer and the seller are opponents. A verdict is only worth something if it comes from
   someone with nothing at stake in the outcome.
3. **The verdict has to be checkable later.** A ruling that lives in a company's database is worth
   nothing in a complaint. A ruling several independent validators had to agree on, recorded with
   its evidence and its reasoning, is.

If a single model produced the answer, this would be an app with an API key. What makes it a
GenLayer contract is that **every validator repeats the whole job and the round only settles if
their derived verdicts match.**

## How the contract is built

### The model perceives; Python judges

The LLM is never asked for the verdict. It is asked to read the archived listing and rate four
factors — `composition`, `distinctive_elements`, `text_and_typography`, `subject_matter` — plus a
`generic_trope` flag. The contract then adds the published weights in plain Python and applies the
thresholds:

| Factor | MATCH | PARTIAL | DIFFERENT |
|---|---|---|---|
| Composition | +3 | +1 | 0 |
| Distinctive elements | +4 | +2 | 0 |
| Text & typography | +3 | +1 | 0 |
| Subject matter | +2 | +1 | 0 |
| Generic trope | −3 when YES | | |

`score ≥ 9 → COPY` · `score ≥ 5 → DERIVATIVE` · otherwise `INDEPENDENT`.

That split is the point. It gives the validator something concrete to disagree about — a derived
status — instead of free-form prose that always "looks similar enough".

### What the validator actually checks

`adjudicate` runs one `gl.vm.run_nondet` round. The validator **re-runs the entire leader task**
(re-render the snapshot, re-prompt the model, re-derive the verdict) and then requires:

1. the same read on whether the evidence was usable at all;
2. an **exact** match on the derived verdict — the field that moves money;
3. no more than one of the four factor ratings differing (wording drift is tolerated, seeing a
   different listing is not);
4. scores within 2 points of each other.

This is deliberately not a schema check on the leader's output. A validator that only confirms the
leader returned a valid enum has not verified anything.

### Evidence must be immutable

`file_claim` refuses anything that is not a third-party archive snapshot
(`web.archive.org`, `archive.ph`, `archive.today`, …). This is not a formality. Validators re-fetch
the evidence independently, minutes apart, from different machines. A live marketplace URL is
geo-targeted, JavaScript-rendered, bot-blocked and editable by the very seller under review — two
honest validators would read two different pages and could never agree. A frozen capture also
timestamps the listing on a date the claimant did not choose, which is what makes it evidence.

### Failure modes are designed, not accidental

| Situation | What happens |
|---|---|
| Archive is down or rate-limiting | `[TRANSIENT]` error. The claim stays `PENDING`, the stake is untouched, anyone can retry. |
| Snapshot has no readable listing | `INSUFFICIENT_EVIDENCE`. Stake returned in full — a bad capture is a mistake, not an accusation. |
| Validators time out or disagree | The round does not settle. State is unchanged; the claim is still `PENDING`. |
| Claim upheld | Reporter is credited stake + share of the pool; the design's confirmed-copy counter increments. |
| Withdrawal | The ledger is debited when the transaction is decided; the tokens move once it clears the appeal window (`on="finalized"`), the same shape as an optimistic-rollup exit. `npm run verify:payout` watches one settle end to end. |
| Claim dismissed as `INDEPENDENT` | The stake moves to the design's bounty pool. A wrong accusation is not free. |

### Money never moves inside consensus

Payouts are **pull-based**. `adjudicate` only credits a ledger; `withdraw` is a separate call that
performs the single `emit_transfer`. A slow or disagreeing round can never strand value mid-transfer.

---

## What is on-chain vs. off-chain

| Owner | Responsibility |
|---|---|
| **Contract** | The registry and its prior-art timestamps, escrowed bounties and stakes, the public rubric, the adjudication, the settlement, the credit ledger. |
| **Frontend** | Wallet, forms, formatting, the printable evidence pack. It computes no part of the verdict. |
| **External** | The archived snapshot. Untrusted, re-fetched and re-judged by every validator. |

---

## Running it

### Prerequisites

Node 20+ and a MetaMask wallet. Python 3.11+ only if you want to run the contract tests.

### Frontend

```bash
npm install
cp .env.example .env.local     # NEXT_PUBLIC_CONTRACT_ADDRESS is pre-filled below
npm run dev
```

Point `.env.local` at the deployed instance:

```
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio-next.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61997
NEXT_PUBLIC_CONTRACT_ADDRESS=0xe9B2F2Ea38C88179929FcA211c51C25ca607EE17
```

Open <http://localhost:3000>. Connect MetaMask — the app offers to add and switch to Studio Next for
you, and a bar under the hero will top your wallet up from the Studio faucet if it is empty, so you
can try the whole flow without hunting for test tokens. Append `?motion=off` to any URL to skip the
entrance animations.

### Deploying your own instance

```bash
# .env.local needs DEPLOYER_PRIVATE_KEY (a burner — never a real key)
npm run check:contract     # compile the contract inside GenVM, print its public ABI
npm run deploy:contract    # deploy, then write the address back into .env.local
npm run seed               # register 3 designs, file 2 claims, adjudicate both
npm run smoke              # one end-to-end pass over the live contract
npm run verify:payout      # deploy a throwaway instance and watch a payout settle
```

`scripts/check.mjs` is worth running before every deploy: it compiles the contract on a real GenVM
and prints the public ABI, so syntax errors and bad SDK usage surface in seconds instead of costing
a transaction.

### Contract tests

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements-dev.txt   # Windows
# source .venv/bin/activate && pip install -r requirements-dev.txt          # macOS / Linux

genvm-lint check contracts/knockoff_bounty.py
pytest tests/direct -v
```

Direct-mode tests run the contract in memory with mocked web and LLM responses, so they cover the
deterministic surface — validation, scoring, settlement arithmetic, the ledger — in milliseconds.
They do **not** exercise validator agreement; that is what `scripts/seed.mjs` does against the live
network.

### Deploying the frontend to Vercel

The Next.js app is at the repository root, so Vercel needs no root-directory override. Import the
repo and set the three `NEXT_PUBLIC_*` variables above. `DEPLOYER_PRIVATE_KEY` is only used by the
CLI scripts and must **not** be added to Vercel.

---

## Verifying the result yourself

Nothing here asks you to take our word for it.

1. Open the [contract on the explorer](https://explorer-studio-dev.genlayer.com/address/0xe9B2F2Ea38C88179929FcA211c51C25ca607EE17).
2. Read the rubric off-chain: `get_rubric()` returns the exact constants the frontend displays.
3. Read claim `C1`: the verdict `COPY`, score `9/12`, the four factor ratings and the model's
   rationale are all stored on-chain, alongside the snapshot URL it was derived from.
4. Open that snapshot yourself — an Internet Archive capture of an AliExpress wholesale sticker page
   — and look for "Popular Ancient Lamp Cats and Birds Wall Sticker". That is the listing the court
   found.
5. Read claim `C2`: the **same** snapshot, judged against a different registered design
   ("Sleeping Fox in a Teacup"), returns `INDEPENDENT` with score `0/12`. The seed deliberately
   includes the negative case — a court that only ever rules one way is not a court.

---

## Repository layout

```
contracts/knockoff_bounty.py   the Intelligent Contract
scripts/check.mjs              compile + print ABI on a real GenVM
scripts/deploy.mjs             deploy to Studio Next, write the address into .env.local
scripts/seed.mjs               register, claim and adjudicate a demo docket
scripts/smoke.mjs              single end-to-end pass over the live contract
tests/direct/                  in-memory tests with mocked web + LLM
app/                           Next.js 16 app router
components/                    UI, GSAP motion, transaction panels
lib/genlayer/                  network config, MetaMask adapter, Transaction Kit wiring
lib/genlayer/fee-profile.ts    measured fee allocations per method
```

## Notes and limits

- Verdicts are **community adjudication and evidence, not legal determinations**. The evidence pack
  is designed to be attached to a marketplace complaint, not to replace one.
- Adjudication is text-only today: it compares the registered description against the text of the
  archived listing. Image comparison is the obvious next axis, and the rubric is already shaped for
  it — but it would roughly double the per-validator work, and validator time allocation is already
  the binding constraint (see `lib/genlayer/fee-profile.ts`).
- In the seeded demo the design owner and the reporter are the same burner account, because one
  account deployed and seeded everything. In use they are different people, and nothing in the
  contract couples them.
- `archive.ph` is in the admissible list but is currently behind a bot check that the GenLayer node
  cannot pass; `web.archive.org` snapshots work reliably and are what the demo uses.

## Built with

Next.js 16 · React 19 · Tailwind v4 · GSAP + Lenis · `genlayer-js@2.0.0-rc.1` ·
`@genlayer/transaction-kit@0.1.0-rc.2`

Runner pinned to `py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng`, the concrete
version Studio Next resolves — no `:test` or `:latest` alias.
