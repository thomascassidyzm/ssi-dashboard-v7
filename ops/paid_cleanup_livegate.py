"""paid_cleanup_livegate (cs #968·AI): the ONE gate every paid-cleanup planning kit passes before it touches LIVE.

WHY. 19 Nov (INCIDENT 3): four planners kept running live dry runs and validator sweeps during a learner-DB slowdown,
because a correction message cannot reach a worker mid-tool. Tom's Watson, 12:17Z: "dryrun.py and validate.py
themselves should refuse a live DB connection unless an explicit write-path flag is set, so a stale worker cannot do
this again." So: anything that reaches live — Popty on :3470/:3471/:3472 (edit-batch, script-view, baskets,
/v2/validate, /api/resume, /health), or a database connection that is not the local nightly copy — is REFUSED unless
BOTH hold:
  1. the command carries  --live-ok '<why>'  (a non-empty reason; it is logged to stderr), and
  2. it is 22:00-07:00 Europe/London (computed with zoneinfo, never a fixed UTC offset).
Reads belong on the nightly copy (../paid-cleanup-scan-447/copy-read.cjs); they never need this flag.

The flag is taken OUT of sys.argv when this module is imported, so the tools' own positional parsing is unchanged;
put it last:  python3 -I tools/dryrun.py <course> --live-ok 'Kai 19 Nov: night dry run of item 10'.
Refusal exits 77 (not 75: 75 means "busy, try later" to the night runners, and this is not that).

  import paid_cleanup_livegate as G
  G.install()            every urllib.request.urlopen to a Popty port goes through G.require_live first
  G.require_live(what)   refuse now unless flag + UK night
  G.clamp_chunk(n)       edit-batch dry-run chunk size, clamped to MAX_CHUNK (10), and says so
CLI (for shell kits):  python3 -I paid_cleanup_livegate.py '<what>' [--live-ok '<why>']   exit 0 allowed / 77 refused
"""
import datetime, os, re, sys
from zoneinfo import ZoneInfo

FLAG = '--live-ok'
REFUSED = 77
MAX_CHUNK = 10          # edit-batch dry runs: chunks of 10 ops or fewer (cs #968·AI, after INCIDENT 3)
UK = ZoneInfo('Europe/London')
_LIVE_PORT = re.compile(r'^https?://(localhost|127\.0\.0\.1|\[::1\]|watson-1[^/:]*):347\d(/|$)')


def take_flag(argv=None):
    """remove --live-ok <why> (or --live-ok=<why>) from argv; return why ('' if the flag had no reason, None if absent)"""
    argv = sys.argv if argv is None else argv
    why = None
    i = 1
    while i < len(argv):
        a = argv[i]
        if a == FLAG:
            nxt = argv[i + 1] if i + 1 < len(argv) else ''
            if nxt.startswith('--'):
                nxt = ''
                del argv[i]
            else:
                del argv[i:i + 2]
            why = nxt.strip()
            continue
        if a.startswith(FLAG + '='):
            why = a[len(FLAG) + 1:].strip()
            del argv[i]
            continue
        i += 1
    return why


WHY = take_flag()
_allowed = None


def uk_now():
    return datetime.datetime.now(UK)


def uk_night(now=None):
    h = (now or uk_now()).hour
    return h >= 22 or h < 7


def refuse(what, reason):
    print(f'REFUSED (live gate, cs #968·AI): {what} would reach LIVE. {reason}\n'
          f'  Live work needs  {FLAG} \'<why>\'  AND 22:00-07:00 Europe/London (now {uk_now():%H:%M} UK).\n'
          f'  Planning reads go to the nightly copy (ops/paid-cleanup-scan-447/copy-read.cjs). Nothing was sent.',
          file=sys.stderr, flush=True)
    sys.exit(REFUSED)


def require_live(what):
    """return the logged reason, or exit 77 before anything is sent"""
    global _allowed
    if _allowed is not None:
        return _allowed
    if WHY is None:
        refuse(what, f'No {FLAG} flag was given.')
    if not WHY:
        refuse(what, f'{FLAG} needs a reason: {FLAG} \'<why>\'.')
    if not uk_night():
        refuse(what, f'{FLAG} was given ("{WHY}") but it is daytime in the UK.')
    print(f'LIVE-OK (cs #968·AI) {what} at {uk_now():%Y-%m-%d %H:%M} UK: {WHY}', file=sys.stderr, flush=True)
    _allowed = WHY
    return WHY


def is_live_url(url):
    return bool(_LIVE_PORT.match(str(url)))


def install():
    """route every urllib.request.urlopen to a Popty port through require_live (lazily: only when one is made)"""
    import urllib.request
    if getattr(urllib.request.urlopen, '_livegate', False):
        return
    real = urllib.request.urlopen

    def urlopen(url, *a, **k):
        u = url.full_url if hasattr(url, 'full_url') else url
        if is_live_url(u):
            require_live(f'{os.path.basename(sys.argv[0])} -> {str(u).split("?")[0]}')
        return real(url, *a, **k)
    urlopen._livegate = True
    urllib.request.urlopen = urlopen


def clamp_chunk(n, label='--chunk'):
    n = int(n)
    if n < 1:
        sys.exit(f'{label} must be 1..{MAX_CHUNK}')
    if n > MAX_CHUNK:
        print(f'{label} {n} clamped to {MAX_CHUNK}: edit-batch dry runs go in chunks of {MAX_CHUNK} or fewer (cs #968·AI)',
              file=sys.stderr, flush=True)
        return MAX_CHUNK
    return n


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'a shell step'
    require_live(what)
