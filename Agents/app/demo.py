"""Scripted agent that walks the whole spine, for the demo video.

    Agent -> Payment Intent -> Policy & Authorization -> Private Settlement -> Reconciliation

Run with the Server already up and seeded:

    HYPERTRON_API_KEY=ht_sk_... python -m app.demo
"""

from __future__ import annotations

import asyncio
import sys

from app.core.config import settings
from app.services.hypertron_client import HypertronError
from app.services.payment_agent import PaymentAgent

USDC = 1_000_000


def usd(amount_minor: int) -> str:
    return f"${amount_minor / USDC:,.2f}"


def show(label: str, intent) -> None:
    print(f"\n{label}")
    print(f"  intent    {intent.id}")
    print(f"  status    {intent.status}")
    print(f"  decision  {intent.decision}")
    for reason in intent.reasons:
        print(f"            - {reason}")
    settlement = intent.settlement
    if settlement.get("settlement_id"):
        print(f"  settled   {settlement['settlement_id']}")
        print(f"  commitment {settlement['commitment'][:26]}...")
        print(f"  tx        {settlement['tx_signature'][:26]}...")
        print(f"  view hint {settlement['view_key_hint']}")


async def main() -> int:
    if not settings.hypertron_api_key:
        print("HYPERTRON_API_KEY is not set. Seed the Server and export the key.")
        return 1

    agent = PaymentAgent()

    print("=" * 72)
    print("Hypertron — give agents financial authority without giving away privacy")
    print("=" * 72)

    # 1. Routine invoice, inside the agent's autonomous budget.
    print(f"\n[agent] paying invoice #1829 to supplier_acme for {usd(437 * USDC)}")
    intent = await agent.pay_invoice(
        payee_ref="supplier_acme",
        amount_minor=437 * USDC,
        reference="invoice #1829",
    )
    show("1. Inside autonomous budget -> settled privately", intent)

    # 2. Same call shape, but the amount crosses the human-approval threshold.
    print(f"\n[agent] paying invoice #2044 to supplier_globex for {usd(2_500 * USDC)}")
    parked = await agent.pay_invoice(
        payee_ref="supplier_globex",
        amount_minor=2_500 * USDC,
        reference="invoice #2044",
    )
    show("2. Above threshold -> parked for a human", parked)

    if parked.needs_human:
        print("\n[human] CFO approves in the dashboard")
        await agent.approve(parked.id, approved_by="cfo@northwind.example")
        settled = await agent.check(parked.id)
        while not settled.is_terminal:
            await asyncio.sleep(0.5)
            settled = await agent.check(parked.id)
        show("3. After approval -> settled privately", settled)

    # 3. Policy refuses an unknown counterparty outright.
    print("\n[agent] attempting to pay an unknown counterparty")
    try:
        denied = await agent.pay_invoice(
            payee_ref="supplier_unknown",
            amount_minor=50 * USDC,
            reference="invoice #9001",
        )
        show("4. Payee not allowlisted -> denied", denied)
    except HypertronError as error:
        print(f"  rejected: {error}")

    print("\nThe agent never saw a proof, a note, a nullifier or a Merkle path.")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
