"""Welcome email trigger.

STUB: wire this to your actual email provider (Resend, Postmark, SES, SMTP...).
Kept isolated so the webhook handler stays clean. Must never include credentials.
"""
from __future__ import annotations

import logging
import os

logger = logging.getLogger("onboarding.emails")


def send_welcome_email(*, to_email: str | None, business_name: str | None) -> None:
    """Send the post-payment welcome email.

    Replace the body of this function with a real provider call. Do NOT raise on
    failure in a way that breaks the Stripe webhook — log and move on, or enqueue
    a retry, so Stripe still receives a 200 and does not redeliver endlessly.
    """
    if not to_email:
        logger.warning("welcome email skipped: no email on file for %s", business_name)
        return

    provider_key = os.environ.get("EMAIL_API_KEY")
    if not provider_key:
        logger.info("EMAIL_API_KEY unset — would send welcome email to %s", to_email)
        return

    # TODO: real send, e.g. Resend:
    #   import resend
    #   resend.api_key = provider_key
    #   resend.Emails.send({
    #       "from": "Desired Labs <hello@desiredlabs.ai>",
    #       "to": to_email,
    #       "subject": "Welcome to Desired Labs 🎉",
    #       "html": render_welcome(business_name),
    #   })
    logger.info("welcome email sent to %s", to_email)
