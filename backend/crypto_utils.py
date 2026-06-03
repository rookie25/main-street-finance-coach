"""Fernet (AES-256) encryption helpers for client API credentials.

Every credential (Square key, Plaid token, Gmail token) is encrypted with this
module BEFORE it touches the database. Raw values are never persisted or logged.

The key comes from the FERNET_KEY env var. Generate one ONCE with:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

WARNING: rotating FERNET_KEY makes all previously-encrypted values unrecoverable.
"""
from __future__ import annotations

import os
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = os.environ.get("FERNET_KEY")
    if not key:
        raise RuntimeError(
            "FERNET_KEY is not set. Generate one with "
            "`python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\"` "
            "and set it in the environment."
        )
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt(plaintext: str | None) -> str | None:
    """Encrypt a credential. Returns None for empty/None input (column stays NULL)."""
    if not plaintext:
        return None
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str | None) -> str | None:
    """Decrypt a stored credential. Returns None for empty/None input.

    Raises InvalidToken if the ciphertext was encrypted with a different key.
    """
    if not ciphertext:
        return None
    try:
        return _fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken as exc:  # pragma: no cover - surfaced to caller
        raise RuntimeError("Failed to decrypt credential (wrong FERNET_KEY?)") from exc
