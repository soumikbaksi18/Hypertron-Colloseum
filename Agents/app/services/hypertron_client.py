"""Thin client for Hypertron's payment-intent API.

This is the whole surface an agent needs. There is deliberately no notion of
proofs, notes, nullifiers, Merkle trees or transactions here: the agent asks for
a payment, learns whether it is authorized, and reads a settlement result.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass
from typing import Any

import httpx

# Lifecycle states that will never change again.
TERMINAL_STATUSES = {"settled", "denied", "failed", "canceled"}
# The agent cannot make progress on its own from here; a human must act.
AWAITING_HUMAN = "requires_approval"


class HypertronError(RuntimeError):
    def __init__(self, status_code: int, payload: dict[str, Any]) -> None:
        error = payload.get("error", {})
        self.code = error.get("code", "unknown")
        self.type = error.get("type", "api_error")
        super().__init__(
            f"{self.type}/{self.code}: {error.get('message', 'request failed')}"
        )
        self.status_code = status_code


@dataclass
class PaymentIntent:
    raw: dict[str, Any]

    @property
    def id(self) -> str:
        return self.raw["id"]

    @property
    def status(self) -> str:
        return self.raw["status"]

    @property
    def decision(self) -> str | None:
        return self.raw.get("authorization", {}).get("decision")

    @property
    def reasons(self) -> list[str]:
        return self.raw.get("authorization", {}).get("reasons", [])

    @property
    def settlement(self) -> dict[str, Any]:
        return self.raw.get("settlement", {})

    @property
    def is_terminal(self) -> bool:
        return self.status in TERMINAL_STATUSES

    @property
    def needs_human(self) -> bool:
        return self.status == AWAITING_HUMAN


class HypertronClient:
    def __init__(self, base_url: str, api_key: str, timeout: float = 10.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = timeout

    async def create_intent(
        self,
        payee_ref: str,
        amount_minor: int,
        reference: str | None = None,
        currency: str | None = None,
        idempotency_key: str | None = None,
    ) -> PaymentIntent:
        """Request a payment. Policy is evaluated before this returns."""
        body: dict[str, Any] = {
            "payee_ref": payee_ref,
            "amount_minor": amount_minor,
        }
        if reference is not None:
            body["reference"] = reference
        if currency is not None:
            body["currency"] = currency

        # Default to a fresh key so a network retry cannot pay twice.
        headers = {"Idempotency-Key": idempotency_key or str(uuid.uuid4())}
        return PaymentIntent(await self._request("POST", "/v1/payment_intents", body, headers))

    async def get_intent(self, intent_id: str) -> PaymentIntent:
        return PaymentIntent(
            await self._request("GET", f"/v1/payment_intents/{intent_id}")
        )

    async def approve_intent(self, intent_id: str, approved_by: str) -> PaymentIntent:
        """The human-in-the-loop leg, exposed for the demo dashboard."""
        return PaymentIntent(
            await self._request(
                "POST",
                f"/v1/payment_intents/{intent_id}/approve",
                {"approved_by": approved_by},
            )
        )

    async def wait_for_settlement(
        self,
        intent_id: str,
        timeout_s: float = 30.0,
        interval_s: float = 0.5,
    ) -> PaymentIntent:
        """Polls until the intent is terminal, or parks when a human is required."""
        deadline = asyncio.get_running_loop().time() + timeout_s
        while True:
            intent = await self.get_intent(intent_id)
            if intent.is_terminal or intent.needs_human:
                return intent
            if asyncio.get_running_loop().time() >= deadline:
                return intent
            await asyncio.sleep(interval_s)

    async def _request(
        self,
        method: str,
        path: str,
        body: dict[str, Any] | None = None,
        extra_headers: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        headers = {"Authorization": f"Bearer {self._api_key}"}
        if extra_headers:
            headers.update(extra_headers)

        async with httpx.AsyncClient(base_url=self._base_url, timeout=self._timeout) as client:
            response = await client.request(method, path, json=body, headers=headers)

        try:
            payload = response.json()
        except ValueError:
            payload = {"error": {"message": response.text}}

        if response.status_code >= 400:
            raise HypertronError(response.status_code, payload)
        return payload
