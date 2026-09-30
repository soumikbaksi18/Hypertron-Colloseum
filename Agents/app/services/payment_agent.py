"""The agent's view of paying a bill.

Intentionally not an agent framework: no planner, no tool loop, no orchestration.
This is the smallest thing that demonstrates an autonomous consumer of bounded
financial authority.
"""

from __future__ import annotations

from app.core.config import settings
from app.services.hypertron_client import HypertronClient, PaymentIntent


class PaymentAgent:
    """Wraps the four things an agent ever does with money."""

    def __init__(self, client: HypertronClient | None = None) -> None:
        self._client = client or HypertronClient(
            base_url=settings.hypertron_api_url,
            api_key=settings.hypertron_api_key,
        )

    async def pay_invoice(
        self,
        payee_ref: str,
        amount_minor: int,
        reference: str | None = None,
        wait: bool = True,
    ) -> PaymentIntent:
        """Request, authorize, execute privately, then read the result."""
        intent = await self._client.create_intent(
            payee_ref=payee_ref,
            amount_minor=amount_minor,
            reference=reference,
        )

        # A denial or a pending human approval is already the final answer
        # as far as the agent is concerned.
        if not wait or intent.is_terminal or intent.needs_human:
            return intent

        return await self._client.wait_for_settlement(
            intent.id,
            timeout_s=settings.settlement_poll_timeout_s,
            interval_s=settings.settlement_poll_interval_s,
        )

    async def check(self, intent_id: str) -> PaymentIntent:
        return await self._client.get_intent(intent_id)

    async def approve(self, intent_id: str, approved_by: str) -> PaymentIntent:
        return await self._client.approve_intent(intent_id, approved_by)
