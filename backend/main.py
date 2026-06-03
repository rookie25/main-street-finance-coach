"""Standalone FastAPI app for local testing of the onboarding routes.

This is a REFERENCE harness. In production you'll copy routes_onboarding.py,
routes_stripe.py, crypto_utils.py, db.py, and emails.py into the groundstack repo
and include the two routers on your existing app:

    from routes_onboarding import onboarding_router
    from routes_stripe import stripe_router
    app.include_router(onboarding_router)
    app.include_router(stripe_router)

Run locally:  uvicorn main:app --reload --port 8000
"""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes_onboarding import onboarding_router
from routes_stripe import stripe_router

app = FastAPI(title="Desired Labs — Onboarding API")

# Allow the Vite frontend to call the onboarding endpoints in dev.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "https://desiredlabs.com"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(onboarding_router)
app.include_router(stripe_router)


@app.get("/health")
def health():
    return {"ok": True}
