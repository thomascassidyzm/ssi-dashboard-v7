#!/bin/bash
# concat-wav.sh <out.wav> <in1.wav> <in2.wav> ...
# Concat demuxer ONLY, matched PCM, then ffprobe-verify the output duration equals
# the sum of inputs (within 25ms) — guards against ffmpeg silently dropping segments.
set -e
OUT="$1"; shift
LIST="$(mktemp)"
sum=0
for f in "$@"; do
  af="$(cd "$(dirname "$f")" && pwd)/$(basename "$f")"
  printf "file '%s'\n" "$af" >> "$LIST"
  d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
  sum=$(echo "$sum + $d" | bc -l)
done
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$LIST" -c:a pcm_s16le "$OUT"
rm -f "$LIST"
got=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
diff=$(echo "if ($got-$sum < 0) -($got-$sum) else ($got-$sum)" | bc -l)
ok="OK"; (( $(echo "$diff > 0.025" | bc -l) )) && ok="!!DROP-SUSPECT!!"
printf "  concat %-24s parts=%d sum=%.3f got=%s %s\n" "$OUT" "$#" "$sum" "$got" "$ok"
