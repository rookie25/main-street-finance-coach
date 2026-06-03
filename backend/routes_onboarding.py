"""Onboarding API routes.

Mount on your FastAPI app:  app.include_router(onboarding_router)

Endpoints
---------
POST /onboard/create-link     (admin only)  -> generate a unique onboarding token for a client
GET  /onboard/session/{token}               -> validate token + return SAFE display data (no creds)
POST /onboard/submit                        -> store business details + Fernet-encrypted credentials
POST /onboard/create-checkout               -> create a Stripe Checkout Session for the custom amount

Security
--------
- create-link requires the X-Admin-Key header (ADMIN_API_KEY env). Only Vishal calls it.
- Tokens expire 7 days after creation; every token-bearing route re-checks expiry.
- Credentials are encrypted with Fernet before storage and are NEVER returned or logged.
- All DB access uses the service-role client (bypasses RLS); the anon key cannot reach these tables.
"""
from __future__ import annotations

import logging
import os
import secrets
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field

from crypto_utils import encrypt
from db import get_db

logger = logging.getLogger("onboarding.routes")

onboarding_router = APIRouter(prefix="/onboard", tags=["onboarding"])

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:8080").rstrip("/")
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _require_admin(x_admin_key: str | None) -> None:
    expected = os.environ.get("ADMIN_API_KEY")
    if not expected or not x_admin_key or not secrets.compare_digest(x_admin_key, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


def _load_active_session(token: str) -> dict:
    """Fetch a session by token, enforcing existence and expiry.

    Raises 404 if unknown, 410 if expired (and marks it expired).
    """
    db = get_db()
    res = db.table("onboarding_sessions").select("*").eq("token", token).limit(1).execute()
    rows = res.data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Invalid onboarding link")

    session = rows[0]
    expires_at = datetime.fromisoformat(session["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        if session.get("status") != "expired":
            db.table("onboarding_sessions").update({"status": "expired"}).eq("token", token).execute()
        raise HTTPException(status_code=410, detail="This onboarding link has expired")

    return session


# --------------------------------------------------------------------------- #
# POST /onboard/create-link  (admin)
# --------------------------------------------------------------------------- #
class CreateLinkRequest(BaseModel):
    client_schema: str = Field(..., min_length=1)
    amount_due: float | None = Field(default=None, ge=0)  # dollars
    currency: str = "usd"


class CreateLinkResponse(BaseModel):
    token: str
    url: str
    expires_at: str


@onboarding_router.post("/create-link", response_model=CreateLinkResponse)
def create_link(body: CreateLinkRequest, x_admin_key: str | None = Header(default=None)):
    _require_admin(x_admin_key)
    db = get_db()

    # Confirm the client exists (natural key = schema_name).
    client = (
        db.table("clients").select("schema_name").eq("schema_name", body.client_schema).limit(1).execute()
    )
    if not (client.data or []):
        raise HTTPException(status_code=404, detail=f"Unknown client_schema: {body.client_schema}")

    token = secrets.token_urlsafe(32)
    insert = (
        db.table("onboarding_sessions")
        .insert(
            {
                "token": token,
                "client_schema": body.client_schema,
                "status": "pending",
                "amount_due": body.amount_due,
                "currency": body.currency,
            }
        )
        .execute()
    )
    row = insert.data[0]
    # Amount in the URL is display-only; the authoritative value lives in the DB.
    amount_q = f"?amount={body.amount_due}" if body.amount_due is not None else ""
    return CreateLinkResponse(
        token=token,
        url=f"{FRONTEND_URL}/onboard/{token}{amount_q}",
        expires_at=row["expires_at"],
    )


# --------------------------------------------------------------------------- #
# GET /onboard/session/{token}  (public, frontend load)
# --------------------------------------------------------------------------- #
@onboarding_router.get("/session/{token}")
def get_session(token: str):
    session = _load_active_session(token)
    db = get_db()
    client = (
        db.table("clients")
        .select("business_name, onboarding_status")
        .eq("schema_name", session["client_schema"])
        .limit(1)
        .execute()
    )
    info = (client.data or [{}])[0]
    # SAFE projection only — never expose client_schema internals or any credential.
    return {
        "status": session["status"],
        "amount_due": session["amount_due"],
        "currency": session["currency"],
        "expires_at": session["expires_at"],
        "business_name": info.get("business_name"),
        "onboarding_status": info.get("onboarding_status"),
    }


# --------------------------------------------------------------------------- #
# POST /onboard/submit  (public, token-gated)
# --------------------------------------------------------------------------- #
class SubmitRequest(BaseModel):
    token: str
    # Step 1 — business details
    business_name: str | None = None
    owner_name: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    business_type: str | None = None
    # Step 2 — integration credentials (raw; encrypted before storage)
    square_api_key: str | None = None
    plaid_token: str | None = None
    gmail_token: str | None = None


@onboarding_router.post("/submit")
def submit(body: SubmitRequest):
    session = _load_active_session(body.token)
    db = get_db()

    # Build the clients update. clients has no phone/address columns, so those are
    # folded into `notes`; map the rest onto real columns. Encrypt all credentials.
    updates: dict = {"onboarding_status": "in_progress"}
    if body.business_name:
        updates["business_name"] = body.business_name
    if body.owner_name:
        updates["client_name"] = body.owner_name
    if body.email:
        updates["email"] = str(body.email)
    if body.business_type:
        updates["business_type"] = body.business_type

    extra_bits = [b for b in (
        f"phone: {body.phone}" if body.phone else None,
        f"address: {body.address}" if body.address else None,
    ) if b]
    if extra_bits:
        updates["notes"] = " | ".join(extra_bits)

    if body.square_api_key:
        updates["encrypted_square_key"] = encrypt(body.square_api_key)
    if body.plaid_token:
        updates["encrypted_plaid_token"] = encrypt(body.plaid_token)
    if body.gmail_token:
        updates["encrypted_gmail_token"] = encrypt(body.gmail_token)

    db.table("clients").update(updates).eq("schema_name", session["client_schema"]).execute()
    db.table("onboarding_sessions").update({"status": "submitted"}).eq("token", body.token).execute()

    # Log only non-sensitive field NAMES that were provided — never values.
    provided = [k for k in ("square_api_key", "plaid_token", "gmail_token")
                if getattr(body, k)]
    logger.info("onboard submit ok for %s; credentials provided: %s",
                session["client_schema"], provided or "none")
    return {"ok": True, "status": "submitted"}


# --------------------------------------------------------------------------- #
# POST /onboard/create-checkout  (public, token-gated)
# --------------------------------------------------------------------------- #
class CheckoutRequest(BaseModel):
    token: str


@onboarding_router.post("/create-checkout")
def create_checkout(body: CheckoutRequest):
    session = _load_active_session(body.token)
    amount = session.get("amount_due")
    if amount is None or amount <= 0:
        raise HTTPException(status_code=400, detail="No payment amount set for this onboarding link")

    # Authoritative amount comes from the DB, not the client. Convert dollars -> cents.
    amount_cents = int(round(float(amount) * 100))
    checkout = stripe.checkout.Session.create(
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": session["currency"],
                "product_data": {"name": "Desired Labs — Onboarding & Setup"},
                "unit_amount": amount_cents,
            },
            "quantity": 1,
        }],
        success_url=f"{FRONTEND_URL}/onboard/{body.token}?paid=1",
        cancel_url=f"{FRONTEND_URL}/onboard/{body.token}?canceled=1",
        # Metadata propagated to the PaymentIntent so the webhook can identify the client.
        metadata={"client_schema": session["client_schema"], "token": body.token},
        payment_intent_data={
            "metadata": {"client_schema": session["client_schema"], "token": body.token},
        },
    )
    # NOTE: do NOT mark paid here — payment is only confirmed by the verified
    # Stripe webhook (payment_intent.succeeded). Status stays 'submitted' until then.
    return {"url": checkout.url}
