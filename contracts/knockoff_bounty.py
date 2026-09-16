# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }
"""
KnockoffBounty - an on-chain design registry and counterfeit adjudication court.

Problem
-------
Independent designers (Etsy / Redbubble / small studios) get their artwork
copied onto AliExpress, Temu and print-on-demand storefronts within weeks.
Their IP complaints are rejected because they are unverified assertions, and
the only "judge" available is the marketplace itself - which earns commission
on the counterfeit listing.

What needs consensus
--------------------
"Is this listing a copy of that design, a derivative, or independent work?"
is a judgment call over unstructured evidence. No deterministic algorithm
answers it (perceptual hashes break on redraws), and no single party can be
trusted to answer it. That is exactly the boundary GenLayer settles:
  evidence -> non-deterministic judgment -> validator agreement -> payout.

Architecture boundary
---------------------
Frontend owns:  UI, wallet, previews, formatting of the evidence pack.
Contract owns:  the registry (prior-art timestamp), escrowed bounties, the
                public rubric, the adjudication, the settlement, the ledger.
External owns:  the archived listing snapshot (immutable, re-fetchable by
                every validator - a live marketplace URL is not).

Determinism notes
-----------------
* Evidence must be an immutable archive snapshot. Live marketplace URLs are
  geo-dependent, JS-rendered, bot-blocked and mutable, so validators could
  never re-fetch the same bytes.
* The LLM only *perceives* (extracts listing facts and rates rubric factors).
  The verdict itself is DERIVED IN PYTHON from those factors, so validators
  compare a derived status, not free-form prose.
* Payouts use a pull-based credit ledger: no value transfer happens inside
  the consensus path. See `withdraw` for a network limitation that currently
  blocks the final hop out of the contract.
"""

import json
from dataclasses import dataclass

import genlayer as gl
from genlayer.storage import allow as allow_storage

# ---------------------------------------------------------------------------
# Error classification (see GenLayer write-contract guidance)
# ---------------------------------------------------------------------------
ERROR_EXPECTED = "[EXPECTED]"      # business logic - deterministic, must match
ERROR_EXTERNAL = "[EXTERNAL]"      # 4xx from source - deterministic, must match
ERROR_TRANSIENT = "[TRANSIENT]"    # 5xx / network - agree if both transient
ERROR_LLM = "[LLM_ERROR]"          # LLM misbehaviour - always disagree, rotate

# ---------------------------------------------------------------------------
# Public, auditable rubric. These constants ARE the law of this court: they are
# readable on-chain by anyone and identical for every claim.
# ---------------------------------------------------------------------------
FACTOR_WEIGHTS = {
    "composition": {"MATCH": 3, "PARTIAL": 1, "DIFFERENT": 0},
    "distinctive_elements": {"MATCH": 4, "PARTIAL": 2, "DIFFERENT": 0},
    "text_and_typography": {"MATCH": 3, "PARTIAL": 1, "DIFFERENT": 0},
    "subject_matter": {"MATCH": 2, "PARTIAL": 1, "DIFFERENT": 0},
}
FACTOR_KEYS = (
    "composition",
    "distinctive_elements",
    "text_and_typography",
    "subject_matter",
)
GENERIC_TROPE_PENALTY = 3          # subtracted when the motif is a common trope
MAX_SCORE = 12

THRESHOLD_COPY = 9                 # score >= 9  -> COPY
THRESHOLD_DERIVATIVE = 5           # score >= 5  -> DERIVATIVE

VERDICT_COPY = "COPY"
VERDICT_DERIVATIVE = "DERIVATIVE"
VERDICT_INDEPENDENT = "INDEPENDENT"
VERDICT_INSUFFICIENT = "INSUFFICIENT_EVIDENCE"

# Share of the remaining bounty pool released per confirmed verdict (basis pts)
PAYOUT_BPS = {VERDICT_COPY: 5000, VERDICT_DERIVATIVE: 2000}

STATUS_PENDING = "PENDING"
STATUS_RESOLVED = "RESOLVED"

# Only immutable evidence is admissible, for one reason: validators re-fetch the
# page independently, minutes apart, from different machines. A live marketplace
# URL is geo-targeted, JS-rendered, bot-blocked and editable by the very seller
# under review, so two honest validators would legitimately disagree. A
# third-party web archive freezes and timestamps the capture, which makes
# re-fetching stable and also proves the listing existed on a date the claimant
# did not choose.
ARCHIVE_MARKERS = (
    "web.archive.org/web/",
    "archive.ph/",
    "archive.today/",
    "archive.is/",
    "archive.li/",
    "archive.vn/",
    "timetravel.mementoweb.org/",
)

# Every validator repeats the whole job - render the page, prompt the model -
# inside a bounded time allocation. Consensus is not "does the leader finish",
# it is "does the slowest honest validator also finish", so the evidence window
# is deliberately small. Oversized prompts do not fail loudly; they time the
# validators out and leave the claim unresolved.
MAX_PAGE_CHARS = 7000
MAX_RATIONALE_CHARS = 320


# ---------------------------------------------------------------------------
# Stored records
# ---------------------------------------------------------------------------
@allow_storage
@dataclass
class Design:
    id: str
    owner: gl.Address
    title: str
    category: str
    description: str
    image_url: str
    registered_at: str
    bounty_atto: gl.u256
    claims_filed: gl.u256
    copies_confirmed: gl.u256
    is_open: bool


@allow_storage
@dataclass
class Claim:
    id: str
    design_id: str
    reporter: gl.Address
    evidence_url: str
    status: str
    verdict: str
    score: gl.u256
    listing_title: str
    listing_seller: str
    listing_price: str
    marketplace: str
    factors_json: str
    generic_trope: str
    rationale: str
    stake_atto: gl.u256
    payout_atto: gl.u256
    filed_at: str
    resolved_at: str


# ---------------------------------------------------------------------------
# Pure helpers (deterministic - safe to call from both leader and validator)
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    """Transaction timestamp, taken from the signed message.

    Every validator replays the same message, so this is identical for all of
    them - unlike a wall-clock read, which would break consensus.
    """
    try:
        raw = gl.message.raw
        value = raw.get("datetime") if isinstance(raw, dict) else None
        if value:
            return str(value)
    except Exception:
        pass
    try:
        return str(gl.message.datetime)
    except Exception:
        return ""


def _is_archive_url(url: str) -> bool:
    low = url.strip().lower()
    if not low.startswith("http://") and not low.startswith("https://"):
        return False
    for marker in ARCHIVE_MARKERS:
        if marker in low:
            return True
    return False


def _clean_page(raw: str) -> str:
    """Strip archive chrome and normalise whitespace so both the leader and the
    validator feed the model the same shape of text."""
    text = raw or ""
    for marker in ("END WAYBACK TOOLBAR INSERT", "end wayback toolbar insert"):
        idx = text.find(marker)
        if idx != -1:
            text = text[idx + len(marker):]
            break
    text = " ".join(text.split())
    return text[:MAX_PAGE_CHARS]


def _parse_json_object(payload) -> dict:
    """LLMs wrap JSON in prose, add trailing commas, or return a string."""
    if isinstance(payload, dict):
        return payload
    if not isinstance(payload, str):
        raise gl.vm.UserError(ERROR_LLM + " Unexpected response type")
    first = payload.find("{")
    last = payload.rfind("}")
    if first == -1 or last == -1 or last <= first:
        raise gl.vm.UserError(ERROR_LLM + " No JSON object in response")
    try:
        return json.loads(payload[first:last + 1])
    except Exception:
        raise gl.vm.UserError(ERROR_LLM + " Malformed JSON in response")


def _norm_factor(value) -> str:
    token = str(value or "").strip().upper().replace("-", "_").replace(" ", "_")
    if token in ("MATCH", "IDENTICAL", "SAME", "EXACT"):
        return "MATCH"
    if token in ("PARTIAL", "SIMILAR", "PARTIAL_MATCH", "SOMEWHAT"):
        return "PARTIAL"
    return "DIFFERENT"


def _norm_yes_no(value) -> str:
    token = str(value or "").strip().upper()
    if token in ("YES", "TRUE", "Y", "1"):
        return "YES"
    return "NO"


def _norm_text(value, limit: int) -> str:
    text = " ".join(str(value or "").split())
    if len(text) > limit:
        return text[:limit]
    return text


def _score_from_factors(factors: dict, generic_trope: str) -> int:
    """Deterministic scoring. The model rates factors; Python assigns the law."""
    score = 0
    for key in FACTOR_KEYS:
        score += FACTOR_WEIGHTS[key][factors[key]]
    if generic_trope == "YES":
        score -= GENERIC_TROPE_PENALTY
    return max(0, min(MAX_SCORE, score))


def _verdict_from_score(score: int, evidence_ok: bool) -> str:
    if not evidence_ok:
        return VERDICT_INSUFFICIENT
    if score >= THRESHOLD_COPY:
        return VERDICT_COPY
    if score >= THRESHOLD_DERIVATIVE:
        return VERDICT_DERIVATIVE
    return VERDICT_INDEPENDENT


def _factor_mismatches(a: dict, b: dict) -> int:
    mismatches = 0
    for key in FACTOR_KEYS:
        if a.get(key) != b.get(key):
            mismatches += 1
    return mismatches


def _handle_leader_error(leaders_res, leader_fn) -> bool:
    """Canonical validator-side error reconciliation."""
    leader_msg = getattr(leaders_res, "message", "") or ""
    try:
        leader_fn()
        return False  # validator succeeded where the leader failed -> disagree
    except gl.vm.UserError as exc:
        validator_msg = getattr(exc, "message", "") or str(exc)
        if validator_msg.startswith(ERROR_EXPECTED) or validator_msg.startswith(ERROR_EXTERNAL):
            return validator_msg == leader_msg
        if validator_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
            return True
        return False
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Contract
# ---------------------------------------------------------------------------
class KnockoffBounty(gl.contract.Contract):
    owner: gl.Address
    min_stake_atto: gl.u256

    designs: gl.storage.TreeMap[str, Design]
    design_ids: gl.storage.DynArray[str]

    claims: gl.storage.TreeMap[str, Claim]
    claim_ids: gl.storage.DynArray[str]
    claims_of_design: gl.storage.TreeMap[str, str]      # design id -> JSON id list

    credits: gl.storage.TreeMap[gl.Address, gl.u256]    # pull-based payouts
    claims_filed_by: gl.storage.TreeMap[gl.Address, gl.u256]
    claims_upheld_by: gl.storage.TreeMap[gl.Address, gl.u256]

    total_bounty_atto: gl.u256
    total_paid_atto: gl.u256
    copies_confirmed: gl.u256

    def __init__(self) -> None:
        self.owner = gl.message.sender_address
        self.min_stake_atto = gl.u256(0)
        self.total_bounty_atto = gl.u256(0)
        self.total_paid_atto = gl.u256(0)
        self.copies_confirmed = gl.u256(0)

    # -- internal ----------------------------------------------------------
    def _require_design(self, design_id: str) -> Design:
        design = self.designs.get(design_id)
        if design is None:
            raise gl.vm.UserError(ERROR_EXPECTED + " Unknown design: " + str(design_id))
        return design

    def _require_claim(self, claim_id: str) -> Claim:
        claim = self.claims.get(claim_id)
        if claim is None:
            raise gl.vm.UserError(ERROR_EXPECTED + " Unknown claim: " + str(claim_id))
        return claim

    def _credit(self, account: gl.Address, amount: int) -> None:
        if amount <= 0:
            return
        current = int(self.credits.get(account) or 0)
        self.credits[account] = gl.u256(current + amount)

    # -- registry ----------------------------------------------------------
    @gl.public.write.payable
    def register_design(
        self,
        title: str,
        category: str,
        description: str,
        image_url: str,
    ) -> str:
        """Register prior art and escrow a bounty. The registration timestamp is
        the piece of evidence a marketplace complaint can never produce on its
        own: an independent, immutable 'I had this first'."""
        clean_title = _norm_text(title, 120)
        clean_category = _norm_text(category, 48)
        clean_description = _norm_text(description, 1200)
        clean_image = _norm_text(image_url, 400)

        if len(clean_title) < 3:
            raise gl.vm.UserError(ERROR_EXPECTED + " Title must be at least 3 characters")
        if len(clean_description) < 30:
            raise gl.vm.UserError(
                ERROR_EXPECTED
                + " Description must be at least 30 characters so validators have something to compare"
            )

        design_id = "D" + str(len(self.design_ids) + 1)
        bounty = int(gl.message.value or 0)

        self.designs[design_id] = Design(
            id=design_id,
            owner=gl.message.sender_address,
            title=clean_title,
            category=clean_category or "uncategorised",
            description=clean_description,
            image_url=clean_image,
            registered_at=_now_iso(),
            bounty_atto=gl.u256(bounty),
            claims_filed=gl.u256(0),
            copies_confirmed=gl.u256(0),
            is_open=True,
        )
        self.design_ids.append(design_id)
        self.claims_of_design[design_id] = "[]"
        self.total_bounty_atto = gl.u256(int(self.total_bounty_atto) + bounty)
        return design_id

    @gl.public.write.payable
    def fund_design(self, design_id: str) -> None:
        """Anyone can back a designer's bounty pool - a community can fund the
        enforcement its own members cannot afford."""
        design = self._require_design(design_id)
        amount = int(gl.message.value or 0)
        if amount <= 0:
            raise gl.vm.UserError(ERROR_EXPECTED + " Funding must be greater than zero")
        design.bounty_atto = gl.u256(int(design.bounty_atto) + amount)
        self.total_bounty_atto = gl.u256(int(self.total_bounty_atto) + amount)

    @gl.public.write
    def close_design(self, design_id: str) -> None:
        design = self._require_design(design_id)
        if gl.message.sender_address != design.owner:
            raise gl.vm.UserError(ERROR_EXPECTED + " Only the design owner can close it")
        if not design.is_open:
            raise gl.vm.UserError(ERROR_EXPECTED + " Design already closed")
        design.is_open = False
        remaining = int(design.bounty_atto)
        if remaining > 0:
            design.bounty_atto = gl.u256(0)
            self.total_bounty_atto = gl.u256(max(0, int(self.total_bounty_atto) - remaining))
            self._credit(design.owner, remaining)

    # -- claims ------------------------------------------------------------
    @gl.public.write.payable
    def file_claim(self, design_id: str, evidence_url: str) -> str:
        """Report a suspected copy. Evidence must be an immutable archive
        snapshot so every validator re-fetches identical bytes."""
        design = self._require_design(design_id)
        if not design.is_open:
            raise gl.vm.UserError(ERROR_EXPECTED + " Design is closed to new claims")

        url = _norm_text(evidence_url, 600)
        if not _is_archive_url(url):
            raise gl.vm.UserError(
                ERROR_EXPECTED
                + " Evidence must be an archive snapshot (web.archive.org, archive.ph,"
                + " archive.today). Live marketplace URLs are mutable and cannot reach consensus."
            )

        stake = int(gl.message.value or 0)
        if stake < int(self.min_stake_atto):
            raise gl.vm.UserError(ERROR_EXPECTED + " Stake below the minimum required to file a claim")

        sender = gl.message.sender_address
        claim_id = "C" + str(len(self.claim_ids) + 1)

        self.claims[claim_id] = Claim(
            id=claim_id,
            design_id=design_id,
            reporter=sender,
            evidence_url=url,
            status=STATUS_PENDING,
            verdict="",
            score=gl.u256(0),
            listing_title="",
            listing_seller="",
            listing_price="",
            marketplace="",
            factors_json="{}",
            generic_trope="",
            rationale="",
            stake_atto=gl.u256(stake),
            payout_atto=gl.u256(0),
            filed_at=_now_iso(),
            resolved_at="",
        )
        self.claim_ids.append(claim_id)

        siblings = json.loads(self.claims_of_design.get(design_id) or "[]")
        siblings.append(claim_id)
        self.claims_of_design[design_id] = json.dumps(siblings)

        design.claims_filed = gl.u256(int(design.claims_filed) + 1)
        self.claims_filed_by[sender] = gl.u256(int(self.claims_filed_by.get(sender) or 0) + 1)
        return claim_id

    # -- the court ---------------------------------------------------------
    def _adjudicate_nondet(self, design: Design, evidence_url: str) -> dict:
        """One consensus round.

        Leader: fetch the archived listing, have the model extract the listing
        facts and rate the four rubric factors, then DERIVE the verdict in
        Python from those factors.

        Validator: independently re-runs the identical task and compares the
        derived verdict plus the factor ratings - not the model's prose.
        """
        design_title = design.title
        design_category = design.category
        design_description = design.description
        design_registered_at = design.registered_at

        def leader_fn() -> dict:
            try:
                page = gl.nondet.web.render(evidence_url, mode="text")
            except Exception as exc:
                # The archive refused or timed out. That is a property of the
                # network at this instant, not of the claim, so it must not burn
                # the reporter's stake: raise a transient error, leave the claim
                # PENDING, and let anyone retry. Two validators that both hit a
                # transient failure still agree (see _handle_leader_error).
                raise gl.vm.UserError(
                    ERROR_TRANSIENT
                    + " Evidence snapshot could not be loaded ("
                    + type(exc).__name__
                    + "). The archive may be rate-limiting; retry adjudication."
                )

            content = _clean_page(page)
            readable = len(content) >= 120
            if not readable:
                content = "(snapshot produced no readable content)"

            task = (
                "Adjudicate a design-infringement claim. Rate factors only; the\n"
                "contract derives the verdict from your ratings.\n\n"
                "REGISTERED DESIGN (prior art, on-chain " + design_registered_at + ")\n"
                "Title: " + design_title + "\n"
                "Category: " + design_category + "\n"
                "Description: " + design_description + "\n\n"
                "MARKETPLACE SNAPSHOT (archived, text only)\n"
                "<<<\n" + content + "\n>>>\n\n"
                "Find the single listing on the page that is closest to the registered\n"
                "design and judge against that one. Rate each factor MATCH, PARTIAL or\n"
                "DIFFERENT, using only what the snapshot actually says; when it says\n"
                "nothing about a factor, use DIFFERENT rather than guessing.\n"
                "  composition = layout/arrangement of elements\n"
                "  distinctive_elements = signature details that would not coincide by chance\n"
                "  text_and_typography = wording, slogans, lettering\n"
                "  subject_matter = what the artwork depicts\n"
                "generic_trope = YES if the shared motif is a common idea two creators\n"
                "could reach independently. evidence_quality = UNREADABLE if the snapshot\n"
                "holds no product listing. rationale: max 35 words, cite what you saw.\n\n"
                "Reply with ONLY this JSON:\n"
                "{\"evidence_quality\":\"OK|UNREADABLE\",\"listing_title\":\"\",\"listing_seller\":\"\","
                "\"listing_price\":\"\",\"marketplace\":\"\",\"composition\":\"MATCH|PARTIAL|DIFFERENT\","
                "\"distinctive_elements\":\"MATCH|PARTIAL|DIFFERENT\","
                "\"text_and_typography\":\"MATCH|PARTIAL|DIFFERENT\","
                "\"subject_matter\":\"MATCH|PARTIAL|DIFFERENT\","
                "\"generic_trope\":\"YES|NO\",\"rationale\":\"\"}"
            )

            raw = gl.nondet.exec_prompt(task, response_format="json")
            parsed = _parse_json_object(raw)

            quality = str(parsed.get("evidence_quality", "OK")).strip().upper()
            evidence_ok = readable and quality != "UNREADABLE"

            factors = {}
            for key in FACTOR_KEYS:
                factors[key] = _norm_factor(parsed.get(key))

            generic_trope = _norm_yes_no(parsed.get("generic_trope"))
            score = _score_from_factors(factors, generic_trope)
            verdict = _verdict_from_score(score, evidence_ok)

            return {
                "verdict": verdict,
                "score": score,
                "evidence_ok": evidence_ok,
                "factors": factors,
                "generic_trope": generic_trope,
                "listing_title": _norm_text(parsed.get("listing_title"), 160),
                "listing_seller": _norm_text(parsed.get("listing_seller"), 90),
                "listing_price": _norm_text(parsed.get("listing_price"), 40),
                "marketplace": _norm_text(parsed.get("marketplace"), 60),
                "rationale": _norm_text(parsed.get("rationale"), MAX_RATIONALE_CHARS),
            }

        def validator_fn(leaders_res) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return _handle_leader_error(leaders_res, leader_fn)

            leader = leaders_res.calldata
            if not isinstance(leader, dict):
                return False

            mine = leader_fn()

            # 1. Both sides must agree the evidence was usable at all.
            if bool(leader.get("evidence_ok")) != bool(mine["evidence_ok"]):
                return False
            if not mine["evidence_ok"]:
                return True  # both read an unusable snapshot - a valid shared outcome

            # 2. The settlement-bearing field must match exactly.
            if str(leader.get("verdict")) != mine["verdict"]:
                return False

            # 3. The ratings behind it must broadly agree: one factor may drift
            #    on wording, two would mean the two runs saw different things.
            leader_factors = leader.get("factors")
            if not isinstance(leader_factors, dict):
                return False
            if _factor_mismatches(leader_factors, mine["factors"]) > 1:
                return False

            # 4. Scores must land in the same neighbourhood.
            try:
                leader_score = int(leader.get("score"))
            except (TypeError, ValueError):
                return False
            return abs(leader_score - mine["score"]) <= 2

        return gl.vm.run_nondet(leader_fn, validator_fn)

    @gl.public.write
    def adjudicate(self, claim_id: str) -> str:
        """Anyone may push a pending claim through the court - the outcome does
        not depend on who asks for it."""
        claim = self._require_claim(claim_id)
        if claim.status != STATUS_PENDING:
            raise gl.vm.UserError(ERROR_EXPECTED + " Claim already resolved")

        design = self._require_design(claim.design_id)
        outcome = self._adjudicate_nondet(design, claim.evidence_url)

        verdict = str(outcome.get("verdict") or VERDICT_INSUFFICIENT)
        if verdict not in (
            VERDICT_COPY,
            VERDICT_DERIVATIVE,
            VERDICT_INDEPENDENT,
            VERDICT_INSUFFICIENT,
        ):
            raise gl.vm.UserError(ERROR_LLM + " Verdict outside the accepted value space")

        factors = outcome.get("factors") or {}
        normalised_factors = {}
        for key in FACTOR_KEYS:
            normalised_factors[key] = str(factors.get(key, "DIFFERENT"))

        claim.verdict = verdict
        claim.score = gl.u256(max(0, min(MAX_SCORE, int(outcome.get("score") or 0))))
        claim.listing_title = str(outcome.get("listing_title") or "")
        claim.listing_seller = str(outcome.get("listing_seller") or "")
        claim.listing_price = str(outcome.get("listing_price") or "")
        claim.marketplace = str(outcome.get("marketplace") or "")
        claim.factors_json = json.dumps(normalised_factors, sort_keys=True)
        claim.generic_trope = str(outcome.get("generic_trope") or "NO")
        claim.rationale = str(outcome.get("rationale") or "")
        claim.status = STATUS_RESOLVED
        claim.resolved_at = _now_iso()

        stake = int(claim.stake_atto)
        pool = int(design.bounty_atto)

        if verdict == VERDICT_COPY or verdict == VERDICT_DERIVATIVE:
            payout = (pool * PAYOUT_BPS[verdict]) // 10000
            if payout > 0:
                design.bounty_atto = gl.u256(pool - payout)
                self.total_bounty_atto = gl.u256(max(0, int(self.total_bounty_atto) - payout))
                self.total_paid_atto = gl.u256(int(self.total_paid_atto) + payout)
            claim.payout_atto = gl.u256(payout)
            self._credit(claim.reporter, stake + payout)
            design.copies_confirmed = gl.u256(int(design.copies_confirmed) + 1)
            self.copies_confirmed = gl.u256(int(self.copies_confirmed) + 1)
            self.claims_upheld_by[claim.reporter] = gl.u256(
                int(self.claims_upheld_by.get(claim.reporter) or 0) + 1
            )
        elif verdict == VERDICT_INDEPENDENT:
            # A rejected accusation is not free: the stake compensates the
            # design owner's pool for the adjudication it just paid for.
            if stake > 0:
                design.bounty_atto = gl.u256(pool + stake)
                self.total_bounty_atto = gl.u256(int(self.total_bounty_atto) + stake)
        else:
            # Unusable evidence is a mistake, not an accusation - stake returned.
            self._credit(claim.reporter, stake)

        return verdict

    # -- settlement --------------------------------------------------------
    @gl.public.write
    def withdraw(self) -> int:
        """Pull-based payout: the court credits a ledger, the recipient claims.

        Known limitation on Studio Next (verified with scripts/verify-payout.mjs
        on 2026-09-16): a transaction there is allotted no message budget, so the
        transfer this emits is recorded on the receipt and never dispatched. It
        is the same at `on="decided"`; supplying a hand-built message allocation
        is rejected with InvalidFeeParams, and `use_balance=True` needs a
        permission the network does not grant. Escrowing in works, the ledger and
        the settlement arithmetic are exact, and this method is correct the day
        the network dispatches messages - but until then it would zero a balance
        the caller cannot actually receive, so it refuses to run rather than
        quietly burning it. The frontend surfaces the same reason.

        Remove the guard (and only the guard) once messages dispatch.
        """
        sender = gl.message.sender_address
        amount = int(self.credits.get(sender) or 0)
        if amount <= 0:
            raise gl.vm.UserError(ERROR_EXPECTED + " Nothing to withdraw")

        raise gl.vm.UserError(
            ERROR_EXPECTED
            + " Withdrawals are disabled on this network: it dispatches no outbound"
            + " messages, so the payout could not reach you. Your credit is safe and"
            + " stays claimable. See README 'Known limitation'."
        )

        # Reachable once the guard above is removed.
        self.credits[sender] = gl.u256(0)
        gl.chain.Account(sender).emit_transfer(gl.u256(amount), on="finalized")
        return amount

    # -- admin -------------------------------------------------------------
    @gl.public.write
    def set_min_stake(self, min_stake_atto: int) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(ERROR_EXPECTED + " Only the contract owner")
        if int(min_stake_atto) < 0:
            raise gl.vm.UserError(ERROR_EXPECTED + " Minimum stake cannot be negative")
        self.min_stake_atto = gl.u256(int(min_stake_atto))

    # -- views -------------------------------------------------------------
    def _design_dict(self, design: Design) -> dict:
        return {
            "id": design.id,
            "owner": design.owner.as_hex,
            "title": design.title,
            "category": design.category,
            "description": design.description,
            "image_url": design.image_url,
            "registered_at": design.registered_at,
            "bounty_atto": str(int(design.bounty_atto)),
            "claims_filed": int(design.claims_filed),
            "copies_confirmed": int(design.copies_confirmed),
            "is_open": bool(design.is_open),
        }

    def _claim_dict(self, claim: Claim) -> dict:
        return {
            "id": claim.id,
            "design_id": claim.design_id,
            "reporter": claim.reporter.as_hex,
            "evidence_url": claim.evidence_url,
            "status": claim.status,
            "verdict": claim.verdict,
            "score": int(claim.score),
            "max_score": MAX_SCORE,
            "listing_title": claim.listing_title,
            "listing_seller": claim.listing_seller,
            "listing_price": claim.listing_price,
            "marketplace": claim.marketplace,
            "factors": json.loads(claim.factors_json or "{}"),
            "generic_trope": claim.generic_trope,
            "rationale": claim.rationale,
            "stake_atto": str(int(claim.stake_atto)),
            "payout_atto": str(int(claim.payout_atto)),
            "filed_at": claim.filed_at,
            "resolved_at": claim.resolved_at,
        }

    @gl.public.view
    def get_designs(self) -> list:
        out = []
        for design_id in self.design_ids:
            out.append(self._design_dict(self.designs[design_id]))
        return out

    @gl.public.view
    def get_design(self, design_id: str) -> dict:
        return self._design_dict(self._require_design(design_id))

    @gl.public.view
    def get_claims(self) -> list:
        out = []
        for claim_id in self.claim_ids:
            out.append(self._claim_dict(self.claims[claim_id]))
        return out

    @gl.public.view
    def get_claim(self, claim_id: str) -> dict:
        return self._claim_dict(self._require_claim(claim_id))

    @gl.public.view
    def get_claims_for_design(self, design_id: str) -> list:
        ids = json.loads(self.claims_of_design.get(design_id) or "[]")
        out = []
        for claim_id in ids:
            out.append(self._claim_dict(self.claims[claim_id]))
        return out

    @gl.public.view
    def get_credit(self, account: str) -> str:
        addr = gl.Address(account) if isinstance(account, (str, bytes)) else account
        return str(int(self.credits.get(addr) or 0))

    @gl.public.view
    def get_reporter_stats(self, account: str) -> dict:
        addr = gl.Address(account) if isinstance(account, (str, bytes)) else account
        return {
            "filed": int(self.claims_filed_by.get(addr) or 0),
            "upheld": int(self.claims_upheld_by.get(addr) or 0),
            "credit_atto": str(int(self.credits.get(addr) or 0)),
        }

    @gl.public.view
    def get_rubric(self) -> dict:
        """The court publishes its own law."""
        return {
            "factor_weights": FACTOR_WEIGHTS,
            "generic_trope_penalty": GENERIC_TROPE_PENALTY,
            "max_score": MAX_SCORE,
            "thresholds": {"COPY": THRESHOLD_COPY, "DERIVATIVE": THRESHOLD_DERIVATIVE},
            "payout_bps": PAYOUT_BPS,
            "admissible_evidence": list(ARCHIVE_MARKERS),
        }

    @gl.public.view
    def get_stats(self) -> dict:
        return {
            "designs": len(self.design_ids),
            "claims": len(self.claim_ids),
            "copies_confirmed": int(self.copies_confirmed),
            "total_bounty_atto": str(int(self.total_bounty_atto)),
            "total_paid_atto": str(int(self.total_paid_atto)),
            "min_stake_atto": str(int(self.min_stake_atto)),
            "owner": self.owner.as_hex,
        }
