from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.hypertron_client import HypertronError
from app.services.payment_agent import PaymentAgent

router = APIRouter(prefix="/payments", tags=["payments"])

agent = PaymentAgent()


class PayInvoiceRequest(BaseModel):
    payee_ref: str = Field(..., max_length=128)
    amount_minor: int = Field(..., gt=0)
    reference: str | None = Field(default=None, max_length=256)
    wait: bool = True


class ApproveRequest(BaseModel):
    approved_by: str = Field(..., max_length=128)


@router.post("/intents")
async def pay_invoice(body: PayInvoiceRequest) -> dict:
    try:
        intent = await agent.pay_invoice(
            payee_ref=body.payee_ref,
            amount_minor=body.amount_minor,
            reference=body.reference,
            wait=body.wait,
        )
    except HypertronError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
    return intent.raw


@router.get("/intents/{intent_id}")
async def get_intent(intent_id: str) -> dict:
    try:
        return (await agent.check(intent_id)).raw
    except HypertronError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error


@router.post("/intents/{intent_id}/approve")
async def approve_intent(intent_id: str, body: ApproveRequest) -> dict:
    try:
        return (await agent.approve(intent_id, body.approved_by)).raw
    except HypertronError as error:
        raise HTTPException(status_code=error.status_code, detail=str(error)) from error
