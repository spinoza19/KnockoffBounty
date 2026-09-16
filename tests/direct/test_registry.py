"""Registry rules: what gets in, what gets rejected, and who owns it."""

from tests.direct.conftest import CONTRACT, DESIGN, GEN, register, to_hex


def test_register_writes_a_complete_record(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    design_id = register(contract, direct_vm, value=10 * GEN)
    assert design_id == "D1"

    design = contract.get_design("D1")
    assert design["title"] == DESIGN["title"]
    assert design["category"] == "wall decal"
    assert design["owner"] == to_hex(direct_alice)
    assert design["bounty_atto"] == str(10 * GEN)
    assert design["claims_filed"] == 0
    assert design["copies_confirmed"] == 0
    assert design["is_open"] is True
    # The prior-art timestamp is the whole point of the entry.
    assert design["registered_at"] != ""


def test_ids_are_assigned_by_the_contract(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    assert register(contract, direct_vm) == "D1"
    assert register(contract, direct_vm, title="Second Design") == "D2"
    assert [d["id"] for d in contract.get_designs()] == ["D1", "D2"]


def test_title_must_be_meaningful(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Title must be at least 3 characters"):
        register(contract, direct_vm, title="ok")


def test_description_must_give_validators_something_to_compare(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Description must be at least 30 characters"):
        register(contract, direct_vm, description="a fox")


def test_anyone_can_top_up_someone_elses_bounty(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm, value=2 * GEN)

    direct_vm.sender = direct_bob
    direct_vm.value = 3 * GEN
    contract.fund_design("D1")
    direct_vm.value = 0

    assert contract.get_design("D1")["bounty_atto"] == str(5 * GEN)
    assert contract.get_stats()["total_bounty_atto"] == str(5 * GEN)


def test_funding_nothing_is_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm)

    with direct_vm.expect_revert("Funding must be greater than zero"):
        contract.fund_design("D1")


def test_unknown_design_is_rejected(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    with direct_vm.expect_revert("Unknown design"):
        contract.get_design("D99")


def test_only_the_owner_can_close_and_the_pool_comes_back(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    register(contract, direct_vm, value=4 * GEN)

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only the design owner can close it"):
        contract.close_design("D1")

    direct_vm.sender = direct_alice
    contract.close_design("D1")

    design = contract.get_design("D1")
    assert design["is_open"] is False
    assert design["bounty_atto"] == "0"
    # Refunds go to the ledger, never straight out of the contract.
    assert contract.get_credit(to_hex(direct_alice)) == str(4 * GEN)


def test_rubric_is_published_by_the_contract(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice

    rubric = contract.get_rubric()
    assert rubric["max_score"] == 12
    assert rubric["thresholds"]["COPY"] == 9
    assert rubric["thresholds"]["DERIVATIVE"] == 5
    assert rubric["factor_weights"]["distinctive_elements"]["MATCH"] == 4
    assert rubric["generic_trope_penalty"] == 3
    assert "web.archive.org/web/" in rubric["admissible_evidence"]
