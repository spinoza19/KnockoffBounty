"""Filing rules — above all, what counts as admissible evidence."""

import pytest

from tests.direct.conftest import CONTRACT, GEN, SNAPSHOT, file_claim, register, to_hex

REJECTED = [
    pytest.param("https://www.aliexpress.com/item/1005005167110293.html", id="live-listing"),
    pytest.param("https://www.temu.com/anything.html", id="live-marketplace"),
    pytest.param("web.archive.org/web/2024/https://example.com", id="no-scheme"),
    pytest.param("https://example.com/my-own-screenshot.png", id="self-hosted"),
    pytest.param("", id="empty"),
]

ACCEPTED = [
    pytest.param(SNAPSHOT, id="wayback"),
    pytest.param("https://archive.ph/abc12", id="archive-ph"),
    pytest.param("https://archive.today/2024/https://shop.example/x", id="archive-today"),
]


@pytest.mark.parametrize("url", REJECTED)
def test_mutable_evidence_is_refused(direct_vm, direct_deploy, direct_alice, url):
    """A live marketplace page cannot reach consensus: it is geo-targeted,
    JS-rendered and editable by the seller under review."""
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm)

    with direct_vm.expect_revert("Evidence must be an archive snapshot"):
        file_claim(contract, "D1", direct_vm, url=url)


@pytest.mark.parametrize("url", ACCEPTED)
def test_archive_snapshots_are_admissible(direct_vm, direct_deploy, direct_alice, url):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm)

    claim_id = file_claim(contract, "D1", direct_vm, url=url)
    assert contract.get_claim(claim_id)["evidence_url"] == url


def test_filing_records_a_pending_claim_and_escrows_the_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm, value=10 * GEN)

    direct_vm.sender = direct_bob
    claim_id = file_claim(contract, "D1", direct_vm, stake=GEN)
    assert claim_id == "C1"

    claim = contract.get_claim("C1")
    assert claim["status"] == "PENDING"
    assert claim["verdict"] == ""
    assert claim["reporter"] == to_hex(direct_bob)
    assert claim["stake_atto"] == str(GEN)
    assert claim["design_id"] == "D1"
    assert claim["filed_at"] != ""

    assert contract.get_design("D1")["claims_filed"] == 1
    assert contract.get_reporter_stats(to_hex(direct_bob))["filed"] == 1


def test_claims_are_indexed_per_design(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm)
    register(contract, direct_vm, title="Another Design")

    file_claim(contract, "D1", direct_vm)
    file_claim(contract, "D2", direct_vm)
    file_claim(contract, "D1", direct_vm)

    assert [c["id"] for c in contract.get_claims_for_design("D1")] == ["C1", "C3"]
    assert [c["id"] for c in contract.get_claims_for_design("D2")] == ["C2"]


def test_a_closed_design_takes_no_new_claims(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm)
    contract.close_design("D1")

    with direct_vm.expect_revert("Design is closed to new claims"):
        file_claim(contract, "D1", direct_vm)


def test_minimum_stake_is_enforced_when_the_owner_sets_one(
    direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm)

    # The contract owner is whoever deployed it, not the design owner.
    direct_vm.sender = direct_owner
    contract.set_min_stake(GEN)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Stake below the minimum"):
        file_claim(contract, "D1", direct_vm, stake=GEN // 2)

    assert file_claim(contract, "D1", direct_vm, stake=GEN) == "C1"


def test_only_the_owner_can_change_the_minimum_stake(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the contract owner"):
        contract.set_min_stake(GEN)


def test_unknown_claim_is_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Unknown claim"):
        contract.get_claim("C42")
