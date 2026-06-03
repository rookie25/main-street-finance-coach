# Onboarding backend — drop-in files for the groundstack repo

These are **drop-in modules**, not a deployable service of their own. Copy them into
the existing FastAPI `groundstack` repo (the one Railway deploys) and wire up the
two routers.

## Files

| File | Purpose |
|------|---------|
| `routes_onboarding.py` | `/onboard/create-link`, `/onboard/session/{token}`, `/onboard/submit`, `/onboard/create-checkout` |
| `routes_stripe.py` | `/webhook/stripe` (payment_intent.succeeded → activate client + welcome email) |
| `crypto_utils.py` | Fernet (AES-256) encrypt/decrypt for credentials |
| `db.py` | Supabase service-role client (bypasses RLS) |
| `emails.py` | Welcome-email stub — wire to your provider |
| `main.py` | Reference standalone app for local testing only |
| `requirements.txt` | Python deps to add |
| `.env.example` | Required environment variables |

## Wire into groundstack

```python
from routes_onboarding import onboarding_router
from routes_stripe import stripe_router

app.include_router(onboarding_router)
app.include_router(stripe_router)
```

Adjust the import paths to match groundstack's package layout (e.g. a `app.` prefix).

## Prerequisites (run the SQL first)

Apply both migrations in Supabase before hitting these routes:
- `supabase/clients_onboarding_columns.sql`
- `supabase/onboarding_sessions.sql`

## Environment

See `.env.example`. Set all values in Railway (and locally for testing). Generate the
Fernet key once and never rotate it without re-encrypting existing data.

## Endpoint flow

1. **You** (admin) call `POST /onboard/create-link` with `X-Admin-Key`, a `client_schema`,
   and an `amount_due`. Returns the `/onboard/{token}` URL to send the client.
2. Client opens the link → frontend calls `GET /onboard/session/{token}` to validate.
3. Client submits Steps 1–2 → `POST /onboard/submit` (credentials encrypted server-side).
4. Step 3 → `POST /onboard/create-checkout` → redirect to Stripe.
5. Stripe → `POST /webhook/stripe` → client activated, welcome email sent.

## Stripe webhook setup

Register the endpoint in the Stripe dashboard for the `payment_intent.succeeded` event,
pointing at `https://<railway-domain>/webhook/stripe`, and put the signing secret in
`STRIPE_WEBHOOK_SECRET`. For local testing use the Stripe CLI:

```
stripe listen --forward-to localhost:8000/webhook/stripe
```

## Security notes

- Credentials are Fernet-encrypted **before** storage; raw values are never logged or returned.
- `create-link` is admin-gated via constant-time comparison of `X-Admin-Key`.
- Tokens expire 7 days after creation; expiry is re-checked on every token-bearing call.
- Only the service-role client touches `onboarding_sessions` / `encrypted_*` columns.
- Payment is marked complete **only** by the signature-verified webhook, never by the client.
