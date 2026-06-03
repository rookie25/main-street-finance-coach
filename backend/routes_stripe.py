"""Stripe webhook route.

Mount on your FastAPI app:  app.include_router(stripe_router)

POST /webhook/stripe  -> on payment_intent.succeeded, activate the client and
                          trigger the welcome email.

Security
--------
- The raw request body + Stripe-Signature header are verified against
  STRIPE_WEBHOOK_SECRET. Unverified payloads are rejected with 400.
- The client is identified from PaymentIntent metadata (client_schema/token) that
  we set when creating the Checkout Session — not from anything user-supplied.
"""
from __future__ import annotations

import logging
import os

import stripe
from fastapi import APIRouter, HTTPException, Request

from db import get_db
from emails import send_welcome_email

logger = logging.getLogger("onboarding.stripe")

stripe_router = APIRouter(tags=["stripe"])
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY", "")


@stripe_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    webhook_secret = os.environ.get("STRIPE_WEBHOOK_SECRET")
    if not webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except (ValueError, stripe.error.SignatureVerificationError):
        # Invalid payload or signature — do not trust it.
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        metadata = intent.get("metadata") or {}
        client_schema = metadata.get("client_schema")
        token = metadata.get("token")
        customer_id = intent.get("customer")

        if not client_schema:
            logger.warning("payment_intent.succeeded without client_schema metadata; ignoring")
            return {"received": True}

        db = get_db()
        client_update = {"onboarding_status": "active", "is_active": True}
        if customer_id:
            client_update["stripe_customer_id"] = customer_id
        db.table("clients").update(client_update).eq("schema_name", client_schema).execute()

        if token:
            db.table("onboarding_sessions").update({"status": "completed"}).eq("token", token).execute()

        # Look up the email to welcome (never log credentials).
        res = db.table("clients").select("email, business_name").eq("schema_name", client_schema).limit(1).execute()
        info = (res.data or [{}])[0]
        try:
            send_welcome_email(to_email=info.get("email"), business_name=info.get("business_name"))
        except Exception:  # never fail the webhook on email errors
            logger.exception("welcome email failed for %s", client_schema)

        logger.info("client %s activated via payment_intent.succeeded", client_schema)

    # Acknowledge all events so Stripe stops retrying.
    return {"received": True}
