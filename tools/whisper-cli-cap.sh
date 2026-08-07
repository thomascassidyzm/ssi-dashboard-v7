#!/bin/bash
# Global concurrency cap for whisper-cli, installed AT the binary path
# (~/.local/bin/whisper-cli) with the real binary moved to whisper-cli.real.
#
# Why here and not in config: whisper is spawned from two places
# (services/tts-service.cjs phonology gate, services/audio-veracity.cjs QC),
# and both caps (XAI_PHONO_CONCURRENCY, AUDIO_CONCURRENCY) are PER NODE
# PROCESS. Concurrent course rebuilds run one phase8 process each, so no env
# var can bound the total. A flock semaphore on the binary is the only place
# that sees every caller, in every run, present and future — and because each
# clip spawns a fresh whisper-cli, it applies to already-running rebuilds
# without restarting them.
#
# Two knobs, both env-overridable per call:
#   WHISPER_MAX_CONCURRENT  slots in the semaphore   (default 4)
#   WHISPER_MAX_THREADS     clamp on -t              (default 2)
# 4 x 2 = 8 threads = watson-1's core count, so batch QC tops out at load ~8
# and leaves the box responsive for interactive work.
#
# Escape hatch: WHISPER_NO_SEMAPHORE=1 bypasses entirely (interactive use —
# a human waiting on one transcription should never queue behind a rebuild).

set -u
REAL="${BASH_SOURCE[0]%/*}/whisper-cli.real"

if [ ! -x "$REAL" ]; then
  echo "whisper-cli-cap: real binary missing at $REAL" >&2
  exit 127
fi

if [ "${WHISPER_NO_SEMAPHORE:-0}" = "1" ]; then
  exec "$REAL" "$@"
fi

# Auto-bypass for interactive transcription. command-surface's voice path
# (server.js execNiced -> WHISPER_BIN) always passes --prompt, because it feeds
# whisper a lexicon of Tom's names and jargon; the batch callers
# (audio-veracity.cjs, tts-service.cjs phonology gate) never pass it. Detecting
# that here means a human waiting on one transcription skips the queue with no
# change to command-surface and no restart of a running server.
for a in "$@"; do
  case "$a" in
    --prompt|*/cs-vstream-*) exec "$REAL" "$@" ;;
  esac
done

SLOTS="${WHISPER_MAX_CONCURRENT:-4}"
MAXT="${WHISPER_MAX_THREADS:-2}"

# Clamp -t so N concurrent processes can't multiply into N*threads runqueue.
args=()
prev=""
for a in "$@"; do
  if [ "$prev" = "-t" ] || [ "$prev" = "--threads" ]; then
    if [ "$a" -gt "$MAXT" ] 2>/dev/null; then a="$MAXT"; fi
  fi
  args+=("$a")
  prev="$a"
done

SEMDIR="${WHISPER_SEM_DIR:-/tmp/whisper-sem}"
mkdir -p "$SEMDIR" 2>/dev/null || true

# Poll the slot files rather than blocking on one: whichever frees first wins,
# and a killed waiter leaves nothing behind. Clips are seconds long, so a
# 250ms poll costs nothing measurable.
while true; do
  for i in $(seq 1 "$SLOTS"); do
    exec {fd}>"$SEMDIR/slot$i" 2>/dev/null || continue
    if flock -n "$fd"; then
      # flock survives exec: the slot stays held for whisper's whole life and
      # is released by the kernel when it exits, however it exits.
      #
      # nice: the cap bounds how much CPU batch QC takes, but the box also
      # carries node, lint runs and agent sessions, so load does not fall to
      # the core count on the cap alone. Priority is what actually protects a
      # human waiting on one transcription — at nice 15 the batch clips yield
      # the moment anything interactive wants the CPU, and lose almost nothing
      # when it doesn't.
      exec nice -n "${WHISPER_NICE:-15}" "$REAL" "${args[@]}"
    fi
    exec {fd}>&-
  done
  sleep 0.25
done
