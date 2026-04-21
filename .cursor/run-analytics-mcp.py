"""Launch Google Analytics MCP with stdout kept clean for the MCP JSON-RPC stream.

The upstream analytics-mcp package prints a startup line to stdout before handing
off to stdio transport; some MCP hosts treat any stdout noise as protocol breakage.
Redirect builtins.print to stderr before importing the server.
"""

from __future__ import annotations

import builtins
import sys

_real_print = builtins.print


def _print_to_stderr(*args, **kwargs) -> None:
    kwargs.setdefault("file", sys.stderr)
    return _real_print(*args, **kwargs)


builtins.print = _print_to_stderr

from analytics_mcp.server import run_server  # noqa: E402

if __name__ == "__main__":
    run_server()
