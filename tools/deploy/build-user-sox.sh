#!/usr/bin/env bash
# Build sox into <repo>/vendor/sox without root, for a machine with no sox package
# (watson-1, 2026-10-27, job #176). services/shared/sox-binary.cjs finds it there.
#
# Upstream SoX 14.4.2 — the release Homebrew ships, i.e. what measured the legacy
# durations on the Mac — with libmad statically linked for MP3 and no plugins.
# Ubuntu's own sox package (sox_ng 14.7) cannot be used from user space: its
# libsox hardcodes the plugin directory, so the mp3 handler never loads.
# Needs gcc, make, curl and apt-get download (no root). Idempotent.
#
# Usage: tools/deploy/build-user-sox.sh [repo-root]   (default: this checkout)
set -euo pipefail

REPO="${1:-$(cd "$(dirname "$0")/../.." && pwd)}"
DEST="$REPO/vendor/sox"
SOX_VERSION=14.4.2
SOX_SHA256=81a6956d4330e75b5827316e44ae381e6f1e8928003c6aa45896da9041ea149c

if [ -x "$DEST/bin/sox" ] && "$DEST/bin/sox" --version | grep -q "v$SOX_VERSION"; then
  echo "sox $SOX_VERSION already at $DEST/bin/sox"; exit 0
fi

WORK="$(mktemp -d "${TMPDIR:-/tmp}/build-user-sox.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
cd "$WORK"

curl -fsSL -o sox.tar.bz2 "https://downloads.sourceforge.net/project/sox/sox/$SOX_VERSION/sox-$SOX_VERSION.tar.bz2"
echo "$SOX_SHA256  sox.tar.bz2" | sha256sum -c -
apt-get download libmad0-dev >/dev/null
dpkg -x libmad0-dev_*.deb dev
rm -f dev/usr/lib/*/libmad.so   # force the static libmad.a

tar xjf sox.tar.bz2
cd "sox-$SOX_VERSION"
LIBDIR="$(echo "$WORK"/dev/usr/lib/*-linux-gnu)"
./configure --prefix="$DEST" --disable-shared --enable-static --without-libltdl --disable-openmp \
  --with-mad --without-lame --without-twolame --without-id3tag --without-png --without-ladspa \
  --without-magic --without-sndfile --without-flac --without-oggvorbis --without-opus \
  --without-wavpack --without-pulseaudio --without-alsa --without-ao --without-oss \
  --without-amrwb --without-amrnb --without-gsm --without-lpc10 \
  CFLAGS="-O2 -std=gnu17 -Wno-error=implicit-function-declaration" \
  CPPFLAGS="-I$WORK/dev/usr/include" LDFLAGS="-L$LIBDIR" >/dev/null
# -Wno-error above: the bundled self-test omits <math.h>, an error under gcc 15.
make -j2 >/dev/null
mkdir -p "$DEST/bin"
install -m 0755 src/sox "$DEST/bin/sox"
ln -sf sox "$DEST/bin/soxi"

"$DEST/bin/sox" --version
"$DEST/bin/sox" --help 2>&1 | grep -q "AUDIO FILE FORMATS:.* mp3" || { echo "sox built without mp3 support" >&2; exit 1; }
echo "installed $DEST/bin/sox"
