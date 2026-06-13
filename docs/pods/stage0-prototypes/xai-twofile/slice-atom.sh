#!/bin/bash
# slice-atom.sh <src.wav> <speech_start> <body_end_hint> <search_cap> <out.wav> [final]
#
# END-CHOP FIX. Slices ONE atom from a slow-gapped source keeping its natural decay.
#   - LEADING edge: start LEAD_PAD before the onset so the word's attack is never clipped.
#   - TRAILING edge: from body_end_hint, scan forward (capped at search_cap, i.e. the
#     start of the NEXT seam so we never bleed into the next atom) until the signal has
#     fully decayed to the floor; then KEEP a generous natural tail beyond that point.
#     This preserves the smooth fade-to-silence instead of a hard -50dB -> -91dB chop.
#
# Args:
#   speech_start   : seconds, audible onset (from silencedetect silence_end)
#   body_end_hint  : seconds, where the loud body ends / decay begins (silence_start)
#   search_cap     : seconds, hard stop for the forward decay scan (next seam start, or file end)
#   final          : "final" => extra-generous tail
set -e
SRC="$1"; START="$2"; END_HINT="$3"; CAP="$4"; OUT="$5"; FINAL="${6:-no}"

LEAD_PAD=0.040
FLOOR_DB=-55
WIN=0.050
STEP=0.010
TAIL_KEEP=0.150
[ "$FINAL" = "final" ] && TAIL_KEEP=0.230

# bc with leading zero
bz() { printf "%.3f" "$(echo "$1" | bc -l)"; }

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
# cap the scan window at search_cap (don't bleed into next atom) and at file end
scan_cap="$CAP"
(( $(echo "$scan_cap > $DUR" | bc -l) )) && scan_cap="$DUR"

end="$END_HINT"
t="$END_HINT"
found=""
while (( $(echo "$t + $WIN <= $scan_cap" | bc -l) )); do
  v=$(ffmpeg -hide_banner -nostats -ss "$(bz $t)" -t "$WIN" -i "$SRC" -af volumedetect -f null - 2>&1 \
      | sed -n 's/.*mean_volume: *\(-*[0-9.]*\) dB.*/\1/p' | head -1)
  if [ -n "$v" ] && (( $(echo "$v < $FLOOR_DB" | bc -l) )); then
    end="$t"; found="y"; break
  fi
  t=$(echo "$t + $STEP" | bc -l)
done
# if it never hit the floor before the cap, the decay runs right up to the seam:
# keep to the cap (the full natural tail, since the seam IS silence).
[ -z "$found" ] && end="$scan_cap"

keep_end=$(echo "$end + $TAIL_KEEP" | bc -l)
(( $(echo "$keep_end > $DUR" | bc -l) )) && keep_end="$DUR"
ss=$(echo "$START - $LEAD_PAD" | bc -l)
(( $(echo "$ss < 0" | bc -l) )) && ss=0

ffmpeg -hide_banner -loglevel error -y -ss "$(bz $ss)" -to "$(bz $keep_end)" -i "$SRC" -c:a pcm_s16le "$OUT"
od=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
printf "  sliced %-26s ss=%s decay_end=%s keep_end=%s dur=%s (final=%s)\n" \
  "$OUT" "$(bz $ss)" "$(bz $end)" "$(bz $keep_end)" "$od" "$FINAL"
