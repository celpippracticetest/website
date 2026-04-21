"""Start gtm-mcp with OAuth client fields.

Uses **GTM_CLIENT_ID**, **GTM_CLIENT_SECRET**, and **GTM_PROJECT_ID** from the
process environment first, then from the workspace **.env** (same keys), then
fills any remaining gaps from **secrets/gtm-client-auth.json** (gitignored).
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_ENV = _ROOT / ".env"
_AUTH = _ROOT / "secrets" / "gtm-client-auth.json"
_GTM_ENV_KEYS = frozenset({"GTM_CLIENT_ID", "GTM_CLIENT_SECRET", "GTM_PROJECT_ID"})


def _load_gtm_from_dotenv() -> None:
    if not _ENV.is_file():
        return
    try:
        raw = _ENV.read_text(encoding="utf-8")
    except OSError:
        print(f"Warning: could not read {_ENV}", file=sys.stderr)
        return
    for line in raw.splitlines():
        s = line.strip()
        if not s or s.startswith("#"):
            continue
        if s.startswith("export "):
            s = s[7:].lstrip()
        if "=" not in s:
            continue
        key, _, val = s.partition("=")
        key = key.strip()
        if key not in _GTM_ENV_KEYS:
            continue
        val = val.strip()
        if len(val) >= 2 and val[0] == val[-1] and val[0] in ("'", '"'):
            val = val[1:-1]
        cur = os.environ.get(key)
        if cur is not None and str(cur).strip() != "":
            continue
        if val:
            os.environ[key] = val


def _apply_oauth_json() -> None:
    if not _AUTH.is_file():
        return
    try:
        data = json.loads(_AUTH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        print(
            f"Warning: could not read OAuth JSON at {_AUTH}",
            file=sys.stderr,
        )
        return
    block = data.get("installed") or data.get("web")
    if not isinstance(block, dict):
        print(
            "Warning: gtm-client-auth.json missing 'installed' or 'web' block",
            file=sys.stderr,
        )
        return
    cid = block.get("client_id")
    csec = block.get("client_secret")
    pid = block.get("project_id")
    def _set_if_missing(key: str, value: object | None) -> None:
        if value is None or str(value).strip() == "":
            return
        cur = os.environ.get(key)
        if cur is None or str(cur).strip() == "":
            os.environ[key] = str(value)

    _set_if_missing("GTM_CLIENT_ID", cid)
    _set_if_missing("GTM_CLIENT_SECRET", csec)
    _set_if_missing("GTM_PROJECT_ID", pid)


_load_gtm_from_dotenv()
_apply_oauth_json()

from gtm_mcp.server import run  # noqa: E402

if __name__ == "__main__":
    run()
