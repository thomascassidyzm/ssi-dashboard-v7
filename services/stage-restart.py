#!/usr/bin/env python3
"""
Runs ~/api/stage/restart.sh on apidev and watches its log stream for the
success notice. Restart.sh blocks and streams the server's startup logs;
"[ NOTICE ] Server started on http://..." is the marker for a healthy boot.

On a crash-loop the script never reaches that line — the server starts
over from scratch each time it crashes. We treat "no Server started within
the timeout window" as failure.

Events (on stderr):
  __SD__:start              {"cmd": "...", "timeoutSeconds": N}
  __SD__:restartSucceeded                                  (Server started observed)
  __SD__:restartFailed      {"reason": "..."}              (timeout / restart.sh exit)
  __SD__:exit               {"code": N}

Delivery on apidev:
  cat services/stage-restart.py | ssh ssi@apidev "python3 -"
"""
import json
import os
import sys

import pexpect

STAGE_API_DIR = os.environ.get("STAGE_API_DIR", "/home/ssi/api/stage")

# Kai's sample boot took ~37s (23:28:09 → 23:28:46). 180s gives headroom for
# slow boots while still catching a restart loop in reasonable time.
RESTART_TIMEOUT_SECONDS = int(os.environ.get("RESTART_TIMEOUT_SECONDS", "180"))
RESTART_SUCCESS_PATTERN = r"Server started on http"


def emit(event: str, **payload) -> None:
    line = f"__SD__:{event}"
    if payload:
        line += " " + json.dumps(payload, separators=(",", ":"))
    print(line, file=sys.stderr, flush=True)


def build_command() -> str:
    if os.environ.get("MOCK") == "1":
        mock = os.environ.get("MOCK_RESTART_SCRIPT")
        if not mock:
            raise RuntimeError("MOCK=1 requires MOCK_RESTART_SCRIPT")
        return mock
    return f"cd {STAGE_API_DIR} && ./restart.sh"


def main() -> int:
    cmd = build_command()
    emit("start", cmd=cmd, timeoutSeconds=RESTART_TIMEOUT_SECONDS)

    child = pexpect.spawn("bash", ["-lc", cmd], encoding="utf-8", timeout=None)
    child.logfile_read = sys.stdout

    exit_code = 1
    try:
        idx = child.expect(
            [RESTART_SUCCESS_PATTERN, pexpect.EOF],
            timeout=RESTART_TIMEOUT_SECONDS,
        )
        if idx == 0:
            emit("restartSucceeded")
            exit_code = 0
        else:
            emit("restartFailed", reason="restart.sh exited before Server started")
    except pexpect.exceptions.TIMEOUT:
        emit(
            "restartFailed",
            reason=f"timeout — no \"Server started\" within {RESTART_TIMEOUT_SECONDS}s "
                   "(likely in restart loop)",
        )
    except KeyboardInterrupt:
        emit("restartFailed", reason="cancelled")
        exit_code = 130
    finally:
        # restart.sh is the foreground tail of the server process; killing it
        # returns control. The systemd-managed server keeps running.
        try:
            child.terminate(force=True)
        except Exception:
            pass
        try:
            child.close()
        except Exception:
            pass

    emit("exit", code=exit_code)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
