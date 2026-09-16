"""Shared helpers for KnockoffBounty direct-mode tests."""

import json

import pytest

from tests.direct import _win32_tmpfile


@pytest.fixture(scope="session", autouse=True)
def _win32_loader_patch():
    """See tests/direct/_win32_tmpfile.py - upstream loader bug on Windows."""
    _win32_tmpfile.install()
    yield
    _win32_tmpfile.uninstall()


CONTRACT = "contracts/knockoff_bounty.py"

GEN = 10**18

SNAPSHOT = (
    "https://web.archive.org/web/20240101000000/"
    "https://www.aliexpress.com/w/wholesale-cat-sticker.html"
)

DESIGN = {
    "title": "Ancient Lamp, Cats & Birds",
    "category": "wall decal",
    "description": (
        "Black silhouette wall decal: two cats sit on a cobbled ledge beneath an ornate "
        "wrought-iron street lamp, three small birds perched along the lamp arm."
    ),
    "image": "https://example.com/lamp.png",
}


def to_hex(addr_bytes):
    """Checksummed hex matching what the contract's views emit via Address.as_hex."""
    if hasattr(addr_bytes, "as_hex"):
        return addr_bytes.as_hex
    from genlayer.types import Address

    return Address(addr_bytes).as_hex


def mock_json_llm(vm, prompt_pattern, response):
    """Register JSON at the direct runner's raw text response boundary."""
    vm.mock_llm(prompt_pattern, json.dumps(json.dumps(response)))


def mock_page(vm, body=None):
    """Mock the archived listing page the contract renders."""
    vm.mock_web(
        r".*web\.archive\.org.*",
        {
            "status": 200,
            "body": body
            or (
                "AliExpress Wholesale cat sticker. Found 13,699 Results. "
                "Free Shipping Popular Ancient Lamp Cats and Birds Wall Sticker Wall Mural "
                "Home Decor Room Kids Decals Wallpaper US $4.42 / piece. ouyang gong's store. "
                "is_customized: yes ; Size: Medium ; Pattern: Plane Wall Sticker."
            ),
        },
    )


def mock_ruling(
    vm,
    composition="MATCH",
    distinctive="MATCH",
    typography="DIFFERENT",
    subject="MATCH",
    trope="NO",
    quality="OK",
    listing="Popular Ancient Lamp Cats and Birds Wall Sticker",
):
    """Mock the adjudicator's factor ratings. The contract derives the verdict."""
    mock_json_llm(
        vm,
        r".*Adjudicate a design-infringement claim.*",
        {
            "evidence_quality": quality,
            "listing_title": listing,
            "listing_seller": "ouyang gong's store",
            "listing_price": "US $4.42",
            "marketplace": "AliExpress",
            "composition": composition,
            "distinctive_elements": distinctive,
            "text_and_typography": typography,
            "subject_matter": subject,
            "generic_trope": trope,
            "rationale": "Listing names the same lamp, cats and birds scene.",
        },
    )


def register(contract, vm=None, value=0, **overrides):
    """Register the sample design, optionally escrowing a bounty."""
    data = {**DESIGN, **overrides}
    if vm is not None:
        vm.value = value
    design_id = contract.register_design(
        data["title"], data["category"], data["description"], data["image"]
    )
    if vm is not None:
        vm.value = 0
    return design_id


def file_claim(contract, design_id, vm=None, stake=0, url=SNAPSHOT):
    if vm is not None:
        vm.value = stake
    claim_id = contract.file_claim(design_id, url)
    if vm is not None:
        vm.value = 0
    return claim_id
