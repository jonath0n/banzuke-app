#!/usr/bin/env python3
"""utils/supabase_utils.py

Shared helpers:
- Lazy, cached Supabase client (service‑role or anon)
- Pre‑configured `requests.Session` with retry/back‑off
- Basic logging config so all scripts have timestamps.

All ingestion scripts should:
    from utils.supabase_utils import supabase, http_session, logger
"""

from __future__ import annotations

import logging
import os
from functools import lru_cache
from typing import Final

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from supabase import Client, create_client
from urllib3.util.retry import Retry

# ---------------------------------------------------------------------------
# Logging – uniform across the repo
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
)
logger: Final = logging.getLogger("banzuke")

# ---------------------------------------------------------------------------
# Environment & Supabase
# ---------------------------------------------------------------------------
# Pull variables from .env (if present) before we read them
load_dotenv()

SUPABASE_URL_ENV = "SUPABASE_URL"
SUPABASE_KEY_ENV_FALLBACKS = ("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY")


@lru_cache(maxsize=1)
def supabase() -> Client:  # noqa: N802  (keep simple public name)
    """Return a singleton `supabase-py` client.

    The function first checks `SUPABASE_SERVICE_ROLE_KEY` (preferred)
    and falls back to the less‑privileged `SUPABASE_KEY`.  Caches the
    client so every module import re‑uses the same connection pool.
    """

    url = os.getenv(SUPABASE_URL_ENV)
    key = None
    for env_name in SUPABASE_KEY_ENV_FALLBACKS:
        key = os.getenv(env_name)
        if key:
            break

    if not url or not key:
        raise RuntimeError(
            "Missing Supabase credentials – set SUPABASE_URL and a service/anon key"
        )

    logger.debug("Creating Supabase client for %s", url)
    return create_client(url, key)


# ---------------------------------------------------------------------------
# HTTP helper with retry/back‑off
# ---------------------------------------------------------------------------

_STATUS_FORCELIST = (429, 500, 502, 503, 504)


def http_session(total_retries: int = 5, backoff_factor: float = 1.25) -> requests.Session:  # noqa: D401
    """Return a `requests.Session` pre‑configured with smart retries."""

    session = requests.Session()
    retry_strategy = Retry(
        total=total_retries,
        backoff_factor=backoff_factor,
        status_forcelist=_STATUS_FORCELIST,
        allowed_methods=(
            "HEAD",
            "GET",
            "OPTIONS",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
        ),
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session 