#!/usr/bin/env python3
"""
Drives `./check -e stage deploy <file>` non-interactively.

Mirrors the prompts in ~/course-tool/commands/deploy.rb on apidev:
  - "Files differ.  Show differences? (Y/N)"  -> "n"
  - "Run checks? (Y/N)"                       -> "y" (or "n" with --skip-checks)
  - "Delete progress entries... (Y/N)"        -> per --delete-progress flag
  - "Deploy course? (Y/N)"                    -> "y"

--skip-checks is for the post-failure retry path: if a deploy passed all
checks but then crashed mid-copy (transient S3FS mount issue), it's safe
to re-run skipping checks because they JUST passed.

Surfaces structured event lines to stderr prefixed with `__SD__:` so the
production-api parent process can parse state changes from stderr while
forwarding the human-readable log on stdout.

Events (on stderr):
  __SD__:start              {"cmd": "...", "deleteProgress": bool}
  __SD__:newCourse          {"courseConfigsId": "..."}   (when "does not yet exist")
  __SD__:identical                                       (no-op early exit)
  __SD__:checksPassed                                    ("All checks passed.")
  __SD__:deployed                                        ("Copying course file...")
  __SD__:done                                            ("Done." from ./check)
  __SD__:failed                                          ("Failed." — exit code overridden to 1)
  __SD__:exit               {"code": N}                  (overall script exit)

The stage server restart is a separate operation — see stage-restart.py.
After a successful deploy the dashboard shows a "Restart stage server"
button that invokes that script.

Delivery on apidev:
  cat services/stage-deploy.py | ssh ssi@apidev "python3 - <id> [--delete-progress]"

Usage (real):    python3 stage-deploy.py [--delete-progress] <courseConfigsId>
Usage (mock):    MOCK=1 SCENARIO=differ python3 stage-deploy.py en-test
"""
import argparse
import json
import os
import re
import sys

import pexpect

# Where the manifest lives on apidev (after git pull). Override via env for tests.
COURSES_DIR = os.environ.get(
    "COURSES_DIR",
    "/home/ssi/course-materials/course-configs/Courses",
)
COURSE_TOOL_DIR = os.environ.get("COURSE_TOOL_DIR", "/home/ssi/course-tool")

# Wall-clock budget for each pexpect.expect() call. A real ./check pass takes
# ~40 min (the "Run checks?" phase is the slow one — checks, not the file
# copy). Longer courses may push to ~1.5h, so 2h is the floor; env-overridable
# for outliers. Without this, child.expect() inherits timeout=None and a hung
# remote prompt sits until TCP keepalive reaps it.
EXPECT_TIMEOUT_SECONDS = int(os.environ.get("STAGE_DEPLOY_TIMEOUT_SECONDS", "7200"))


def emit(event: str, **payload) -> None:
    """Write a structured marker line to stderr so it stays separate from the
    deploy log on stdout. Parent process parses stderr for state events,
    stdout for human-readable log forwarding."""
    line = f"__SD__:{event}"
    if payload:
        line += " " + json.dumps(payload, separators=(",", ":"))
    print(line, file=sys.stderr, flush=True)


def build_command(course_configs_id: str) -> str:
    if os.environ.get("MOCK") == "1":
        # Local test mode — MOCK_SCRIPT env var must point at the mock-check.sh
        # in scripts/experiments/stage-deploy-mock/
        mock = os.environ.get("MOCK_SCRIPT")
        if not mock:
            raise RuntimeError("MOCK=1 requires MOCK_SCRIPT=<path-to-mock-check.sh>")
        scenario = os.environ.get("SCENARIO", "differ")
        return (
            f'SCENARIO={scenario} COURSE_ID={course_configs_id} '
            f'{mock} -e stage deploy /tmp/{course_configs_id}.json'
        )
    # Real apidev invocation: git pull first, then run ./check
    return (
        f'cd {COURSES_DIR} && git pull && '
        f'cd {COURSE_TOOL_DIR} && ./check -e stage deploy '
        f'{COURSES_DIR}/{course_configs_id}.json'
    )




def run(course_configs_id: str, delete_progress: bool, skip_checks: bool) -> int:
    cmd = build_command(course_configs_id)
    emit("start", cmd=cmd, deleteProgress=delete_progress, skipChecks=skip_checks,
         timeoutSeconds=EXPECT_TIMEOUT_SECONDS)

    child = pexpect.spawn("bash", ["-lc", cmd], encoding="utf-8",
                          timeout=EXPECT_TIMEOUT_SECONDS)
    child.logfile_read = sys.stdout
    # HighLine's Y/N validator is strict (regex /\A(?:y(?:es)?|no?)\Z/i). A
    # too-fast sendline right after the prompt has occasionally tripped a
    # "Please enter yes or no" retry. 0.1s buffer + full words makes the
    # answer stable regardless of CR/LF handling.
    child.delaybeforesend = 0.1  # mirror everything to our stdout

    # Patterns the deploy script can emit. Order doesn't matter — pexpect.expect
    # returns the index of whichever pattern matches first.
    patterns = [
        r"Existing file is identical to new file\.",            # 0
        r"does not yet exist\.",                                # 1
        r"Files differ\.\s+Show differences\?\s+\(Y/N\)",       # 2
        r"Run checks\?\s+\(Y/N\)",                              # 3
        r"All checks passed\.",                                 # 4
        r"Delete progress entries.*?\(Y/N\)",                   # 5
        r"Deploy course\?\s+\(Y/N\)",                           # 6
        r"Copying .* to .* bucket\.\.\.",                       # 7
        r"Done\.\r?\n",                                         # 8
        r"Failed\.\r?\n",                                       # 9
        pexpect.EOF,                                            # 10
    ]

    saw_done = False
    saw_failed = False
    saw_deployed = False
    saw_identical = False

    try:
        while True:
            idx = child.expect(patterns)
            if idx == 0:
                saw_identical = True
                emit("identical")
                # Script returns true → "Done." may or may not follow
            elif idx == 1:
                emit("newCourse", courseConfigsId=course_configs_id)
            elif idx == 2:
                child.sendline("no")
            elif idx == 3:
                child.sendline("no" if skip_checks else "yes")
            elif idx == 4:
                emit("checksPassed")
            elif idx == 5:
                child.sendline("yes" if delete_progress else "no")
            elif idx == 6:
                child.sendline("yes")
            elif idx == 7:
                saw_deployed = True
                emit("deployed")
            elif idx == 8:
                saw_done = True
                emit("done")
            elif idx == 9:
                saw_failed = True
                emit("failed")
            elif idx == 10:  # EOF
                break
    except pexpect.exceptions.TIMEOUT:
        emit("failed", reason="timeout")
        child.terminate(force=True)
        emit("exit", code=124)
        return 124
    except KeyboardInterrupt:
        emit("failed", reason="cancelled")
        child.terminate(force=True)
        emit("exit", code=130)
        return 130

    child.close()
    exit_code = child.exitstatus or 0

    # Per deploy.rb: the script always exits 0 even on logical failure (prints
    # "Failed." but never aborts). Treat "Failed." in the output as exit 1 so
    # callers see real success/failure semantics.
    if saw_failed and exit_code == 0:
        exit_code = 1

    # Touch saw_deployed/saw_identical so static analysis doesn't flag them as
    # unused (they're tracked here for completeness; the API uses the
    # "deployed"/"identical" __SD__ events directly to decide whether to offer
    # the restart button).
    _ = (saw_deployed, saw_identical)

    emit("exit", code=exit_code)
    return exit_code


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("course_configs_id")
    ap.add_argument("--delete-progress", action="store_true")
    ap.add_argument("--skip-checks", action="store_true",
                    help="Answer 'n' to Run checks? Use only after a deploy passed checks but crashed mid-cp.")
    args = ap.parse_args()

    # Validate course_configs_id — only alphanum + hyphen allowed (it's
    # interpolated into a shell command, so be strict).
    if not re.fullmatch(r"[a-z0-9-]+", args.course_configs_id):
        print(f"Invalid courseConfigsId: {args.course_configs_id!r}", file=sys.stderr)
        return 2

    return run(args.course_configs_id, args.delete_progress, args.skip_checks)


if __name__ == "__main__":
    sys.exit(main())
