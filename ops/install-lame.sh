#!/usr/bin/env bash
# install-lame — provision the real LAME encoder binary for services/audio-processor.cjs.
# Idempotent: safe to re-run, detects what's already there and only fills the gap.
#
# Why: ffmpeg's own MP3 muxer produces files iOS/AVPlayer can't reliably decode (ID3v2
# prefix + bogus LAME-extension enc_padding) — audio-processor.cjs pipes ffmpeg's WAV
# output through the real lame binary instead (checkLameInstalled/ffmpegFilterToLameMp3,
# audio-processor.cjs:47-58). apt has a `lame` package, but on a box without sudo (e.g.
# watson-1, where sudo is scoped to exactly one unrelated command) that's unusable —
# so on Linux this builds LAME 3.100 from source into ~/.local/bin instead.
#
#   macOS (homebrew): brew install lame.
#   Linux (no root needed): download lame-3.100.tar.gz from SourceForge, ./configure
#   --prefix="$HOME/.local" && make && make install.
#
# Usage:
#   ops/install-lame.sh
set -euo pipefail

LAME_VERSION="3.100"
LAME_URL="https://sourceforge.net/projects/lame/files/lame/${LAME_VERSION}/lame-${LAME_VERSION}.tar.gz/download"
LAME_SRC="$HOME/.local/src/lame-${LAME_VERSION}"
LOCAL_BIN="$HOME/.local/bin"

log() { echo "[install-lame] $*"; }

OS="$(uname -s)"

resolve_lame() {
  command -v lame 2>/dev/null && return 0
  [ -x "$LOCAL_BIN/lame" ] && { echo "$LOCAL_BIN/lame"; return 0; }
  [ -x /opt/homebrew/bin/lame ] && { echo /opt/homebrew/bin/lame; return 0; }
  return 1
}

# --- macOS: homebrew -------------------------------------------------------
install_macos() {
  if resolve_lame >/dev/null 2>&1; then
    log "lame already resolves — skipping brew install"
    return 0
  fi
  command -v brew >/dev/null 2>&1 || { echo "[install-lame] brew not found — install homebrew first" >&2; exit 1; }
  log "installing lame via homebrew"
  brew install lame
}

# --- Linux: build from source, no root needed ------------------------------
install_linux() {
  if resolve_lame >/dev/null 2>&1; then
    log "lame already resolves — skipping build"
    return 0
  fi

  for tool in gcc make curl; do
    command -v "$tool" >/dev/null 2>&1 || { echo "[install-lame] $tool not found — needed to build lame from source" >&2; exit 1; }
  done

  mkdir -p "$(dirname "$LAME_SRC")" "$LOCAL_BIN"
  if [ -d "$LAME_SRC" ]; then
    log "lame-${LAME_VERSION} source already present"
  else
    log "downloading lame-${LAME_VERSION} source"
    curl -fL --progress-bar -o "/tmp/lame-${LAME_VERSION}.tar.gz" "$LAME_URL"
    tar -xzf "/tmp/lame-${LAME_VERSION}.tar.gz" -C "$(dirname "$LAME_SRC")"
    rm -f "/tmp/lame-${LAME_VERSION}.tar.gz"
  fi

  log "building lame (configure --prefix=$HOME/.local && make && make install)"
  (
    cd "$LAME_SRC"
    ./configure --prefix="$HOME/.local" --disable-shared
    make -j
    make install
  )
  log "installed lame -> $LOCAL_BIN/lame"
}

case "$OS" in
  Darwin) install_macos ;;
  Linux)  install_linux ;;
  *) echo "[install-lame] unsupported OS: $OS" >&2; exit 1 ;;
esac

LAME_BIN="$(resolve_lame)"

# --- smoke test ---------------------------------------------------------------
log "smoke test: $LAME_BIN --version"
SMOKE_OK=1
"$LAME_BIN" --version >/tmp/lame-smoke.log 2>&1 || SMOKE_OK=0

if [ "$SMOKE_OK" -eq 1 ]; then
  TMP_WAV="$(mktemp -t lame-smoke-XXXX).wav"
  TMP_MP3="$(mktemp -t lame-smoke-XXXX).mp3"
  if command -v ffmpeg >/dev/null 2>&1 && ffmpeg -f lavfi -i "anullsrc=r=48000:cl=mono" -t 1 -ar 48000 -ac 1 -c:a pcm_s16le -y "$TMP_WAV" >/tmp/ffmpeg-smoke.log 2>&1; then
    if "$LAME_BIN" -m m -b 96 --cbr -q 2 --silent "$TMP_WAV" "$TMP_MP3" >/tmp/lame-smoke.log 2>&1 && [ -s "$TMP_MP3" ]; then
      log "smoke test PASS (lame encoded a real WAV to MP3)"
    else
      log "smoke test FAIL — lame errored encoding a synthesised wav, see /tmp/lame-smoke.log"
      SMOKE_OK=0
    fi
  else
    log "smoke test degraded — could not synthesise a test wav with ffmpeg, see /tmp/ffmpeg-smoke.log"
  fi
  rm -f "$TMP_WAV" "$TMP_MP3"
else
  log "smoke test FAIL — lame --version errored, see /tmp/lame-smoke.log"
fi

# --- summary -----------------------------------------------------------------
echo
echo "== install-lame summary =="
echo "lame: $LAME_BIN"
"$LAME_BIN" --version 2>&1 | head -1
[ "$SMOKE_OK" -eq 1 ] && echo "smoke test:  PASS" || echo "smoke test:  FAIL"
