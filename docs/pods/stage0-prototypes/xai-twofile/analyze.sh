#!/bin/bash
# analyze.sh <file.mp3> — measures duration + internal silences (gaps at seams).
# silencedetect noise floor -35dB, min gap 0.12s (real phrase-boundary pause, not coarticulation).
f="$1"
[ -f "$f" ] || { echo "no file: $f"; exit 1; }
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")
printf "FILE  %s\n" "$f"
printf "  duration: %ss\n" "$dur"
# silencedetect: report internal silences
ffmpeg -hide_banner -nostats -i "$f" -af "silencedetect=noise=-35dB:d=0.12" -f null - 2>&1 \
  | grep -E "silence_(start|end|duration)" \
  | sed 's/^/  /'
echo ""
