"""The court: factor ratings in, derived verdict and settlement out.

The model never returns a verdict — it rates four factors. Everything below
checks that the contract, not the model, decides what those ratings mean.
"""

import pytest

from tests.direct.conftest import (
    CONTRACT,
    GEN,
    file_claim,
    mock_page,
    mock_ruling,
    register,
    to_hex,
)


def _setup(direct_vm, direct_deploy, owner, reporter, bounty=10 * GEN, stake=GEN):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = owner
    register(contract, direct_vm, value=bounty)
    direct_vm.sender = reporter
    file_claim(contract, "D1", direct_vm, stake=stake)
    mock_page(direct_vm)
    return contract


def test_full_match_is_a_copy_and_releases_half_the_pool(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    # 3 + 4 + 0 + 2 = 9 -> COPY
    mock_ruling(direct_vm)

    assert contract.adjudicate("C1") == "COPY"

    claim = contract.get_claim("C1")
    assert claim["status"] == "RESOLVED"
    assert claim["score"] == 9
    assert claim["factors"]["composition"] == "MATCH"
    assert claim["factors"]["text_and_typography"] == "DIFFERENT"
    assert claim["listing_title"].startswith("Popular Ancient Lamp")
    assert claim["marketplace"] == "AliExpress"
    assert claim["resolved_at"] != ""

    # 50% of a 10 GEN pool.
    assert claim["payout_atto"] == str(5 * GEN)
    assert contract.get_design("D1")["bounty_atto"] == str(5 * GEN)
    # Reporter gets the payout and their stake back.
    assert contract.get_credit(to_hex(direct_bob)) == str(6 * GEN)

    assert contract.get_design("D1")["copies_confirmed"] == 1
    assert contract.get_stats()["copies_confirmed"] == 1
    assert contract.get_reporter_stats(to_hex(direct_bob))["upheld"] == 1


def test_partial_borrowing_is_a_derivative_and_pays_less(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    # 1 + 2 + 0 + 2 = 5 -> DERIVATIVE
    mock_ruling(direct_vm, composition="PARTIAL", distinctive="PARTIAL")

    assert contract.adjudicate("C1") == "DERIVATIVE"

    claim = contract.get_claim("C1")
    assert claim["score"] == 5
    assert claim["payout_atto"] == str(2 * GEN)  # 20% of 10 GEN
    assert contract.get_credit(to_hex(direct_bob)) == str(3 * GEN)


def test_nothing_in_common_is_independent_and_the_stake_is_forfeited(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    mock_ruling(
        direct_vm,
        composition="DIFFERENT",
        distinctive="DIFFERENT",
        typography="DIFFERENT",
        subject="DIFFERENT",
    )

    assert contract.adjudicate("C1") == "INDEPENDENT"

    claim = contract.get_claim("C1")
    assert claim["score"] == 0
    assert claim["payout_atto"] == "0"
    # A wrong accusation is not free: the stake compensates the design's pool.
    assert contract.get_credit(to_hex(direct_bob)) == "0"
    assert contract.get_design("D1")["bounty_atto"] == str(11 * GEN)
    assert contract.get_design("D1")["copies_confirmed"] == 0


def test_a_common_motif_is_penalised_out_of_a_copy_verdict(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Same four MATCH ratings, but the motif is one two creators could both
    reach. 3 + 4 + 3 + 2 = 12, minus 3 = 9 ... still a copy; nudge one factor
    down and the penalty is what tips it out."""
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    mock_ruling(direct_vm, typography="PARTIAL", trope="YES")  # 3+4+1+2-3 = 7

    assert contract.adjudicate("C1") == "DERIVATIVE"
    assert contract.get_claim("C1")["score"] == 7
    assert contract.get_claim("C1")["generic_trope"] == "YES"


def test_unreadable_snapshot_returns_the_stake_without_penalty(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    mock_ruling(direct_vm, quality="UNREADABLE")

    assert contract.adjudicate("C1") == "INSUFFICIENT_EVIDENCE"

    claim = contract.get_claim("C1")
    assert claim["payout_atto"] == "0"
    # A bad capture is a mistake, not an accusation.
    assert contract.get_credit(to_hex(direct_bob)) == str(GEN)
    assert contract.get_design("D1")["bounty_atto"] == str(10 * GEN)


def test_a_page_with_no_content_is_insufficient_whatever_the_model_says(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Even if the model claims OK and rates everything MATCH, a snapshot that
    rendered nothing cannot support a verdict."""
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    direct_vm.clear_mocks()
    mock_page(direct_vm, body="404")
    mock_ruling(direct_vm, typography="MATCH")

    assert contract.adjudicate("C1") == "INSUFFICIENT_EVIDENCE"


def test_unrecognised_ratings_degrade_to_different(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """LLMs improvise. Anything outside the allowed vocabulary is treated as the
    conservative answer rather than crashing the round."""
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    mock_ruling(direct_vm, composition="very similar!!", distinctive="identical")

    # "identical" normalises to MATCH (+4); the nonsense one to DIFFERENT (0).
    assert contract.adjudicate("C1") == "DERIVATIVE"
    claim = contract.get_claim("C1")
    assert claim["factors"]["composition"] == "DIFFERENT"
    assert claim["factors"]["distinctive_elements"] == "MATCH"
    assert claim["score"] == 6


def test_a_claim_is_only_adjudicated_once(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    mock_ruling(direct_vm)
    contract.adjudicate("C1")

    with direct_vm.expect_revert("Claim already resolved"):
        contract.adjudicate("C1")


def test_anyone_can_push_a_claim_through_the_court(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    """The outcome must not depend on who pays for the adjudication."""
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    mock_ruling(direct_vm)

    direct_vm.sender = direct_charlie
    assert contract.adjudicate("C1") == "COPY"
    # Charlie paid, Bob is still the one credited.
    assert contract.get_credit(to_hex(direct_charlie)) == "0"
    assert contract.get_credit(to_hex(direct_bob)) == str(6 * GEN)


def test_the_pool_drains_gracefully_across_repeat_offenders(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob, stake=0)
    mock_ruling(direct_vm)
    contract.adjudicate("C1")
    assert contract.get_design("D1")["bounty_atto"] == str(5 * GEN)

    file_claim(contract, "D1", direct_vm, stake=0)
    contract.adjudicate("C2")
    # Half of what is left, never more than the pool holds.
    assert contract.get_design("D1")["bounty_atto"] == str(GEN * 5 // 2)
    assert contract.get_stats()["total_paid_atto"] == str(GEN * 15 // 2)


def test_withdraw_refuses_rather_than_burning_a_credit(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """Studio Next dispatches no outbound messages, so paying out would zero a
    balance the caller cannot receive. The guard must fire before the debit."""
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)
    mock_ruling(direct_vm)
    contract.adjudicate("C1")

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Withdrawals are disabled on this network"):
        contract.withdraw()

    # The credit survives the refusal - that is the whole point of the guard.
    assert contract.get_credit(to_hex(direct_bob)) == str(6 * GEN)


def test_withdraw_still_rejects_an_empty_ledger_first(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob)

    direct_vm.sender = direct_charlie_free = direct_alice
    with direct_vm.expect_revert("Nothing to withdraw"):
        contract.withdraw()


def test_a_zero_bounty_design_still_produces_a_ruling(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    """The evidence pack is the product; the bounty is only the incentive."""
    contract = _setup(direct_vm, direct_deploy, direct_alice, direct_bob, bounty=0, stake=0)
    mock_ruling(direct_vm)

    assert contract.adjudicate("C1") == "COPY"
    assert contract.get_claim("C1")["payout_atto"] == "0"
    assert contract.get_claim("C1")["rationale"] != ""
