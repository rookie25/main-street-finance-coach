"""Supabase access for the onboarding routes.

Uses the Supabase REST API via `requests` with the service-role key — the SAME
pattern the rest of main.py already uses (see /receipt/* handlers). This avoids
the supabase-py client entirely (which isn't exercised elsewhere in this app and
conflicts with the pinned httpx version at runtime).

The key MUST be a service_role key: onboarding_sessions has RLS enabled with no
policies, so only service_role can read/write it.
"""
from __future__ import annotations

import os

import requests

_TIMEOUT = 30


def _creds() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    # Groundstack convention: SUPABASE_KEY (service role). Accept the explicit var too.
    key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set.")
    return url, key


def _headers(key: str, prefer: str | None = None) -> dict:
    h = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    if prefer:
        h["Prefer"] = prefer
    return h


def sb_select(table: str, params: dict) -> list:
    """GET rows from a table. `params` are PostgREST query params
    (e.g. {"select": "*", "token": "eq.abc", "limit": "1"})."""
    url, key = _creds()
    resp = requests.get(
        f"{url}/rest/v1/{table}", params=params, headers=_headers(key), timeout=_TIMEOUT
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Supabase select {table}: {resp.status_code} {resp.text}")
    return resp.json()


def sb_insert(table: str, row: dict, prefer: str = "return=representation") -> list | None:
    url, key = _creds()
    resp = requests.post(
        f"{url}/rest/v1/{table}", json=row, headers=_headers(key, prefer), timeout=_TIMEOUT
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Supabase insert {table}: {resp.status_code} {resp.text}")
    return resp.json() if "representation" in prefer else None


def sb_update(table: str, match: dict, changes: dict, prefer: str = "return=minimal") -> list | None:
    """PATCH rows matching `match` (column -> value, applied as eq filters).

    A non-empty `match` is REQUIRED — guards against an unfiltered PATCH that would
    rewrite every row in the table.
    """
    if not match:
        raise ValueError("sb_update requires a non-empty match filter")
    url, key = _creds()
    params = {col: f"eq.{val}" for col, val in match.items()}
    resp = requests.patch(
        f"{url}/rest/v1/{table}", params=params, json=changes,
        headers=_headers(key, prefer), timeout=_TIMEOUT,
    )
    if resp.status_code >= 400:
        raise RuntimeError(f"Supabase update {table}: {resp.status_code} {resp.text}")
    return resp.json() if "representation" in prefer else None
