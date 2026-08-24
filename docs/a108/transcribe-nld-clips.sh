#!/bin/bash
# Whisper-decode the nld_for_eng non-draft pod clips flagged for T-V register.
# Free, unprimed decode (no --prompt): the stored text is never shown to whisper,
# which is the only way the transcript can contradict the text. Same shape as
# services/audio-veracity.cjs decodeAudio(), ggml-medium rather than ggml-small
# because the question here is a one-word one ("je" vs "u", "alsjeblieft" vs
# "alstublieft") rather than silence/truncation.
set -u
OUT=/tmp/nld-transcripts
mkdir -p "$OUT"
MODEL=$HOME/.local/share/whisper-models/ggml-medium.bin
BASE=https://ssi-audio-stage.s3.eu-west-1.amazonaws.com

while IFS='|' read -r id voice origin vchk s3key text; do
  [ -z "$id" ] && continue
  [ -s "$OUT/$id.txt" ] && continue
  curl -sf "$BASE/$s3key" -o "$OUT/$id.src" || { echo "DOWNLOAD-FAIL $id" >&2; continue; }
  ffmpeg -y -loglevel error -i "$OUT/$id.src" -ar 16000 -ac 1 "$OUT/$id.wav" || continue
  ~/.local/bin/whisper-cli -m "$MODEL" -l nl -t 2 -np -oj -of "$OUT/$id" -f "$OUT/$id.wav" >/dev/null 2>&1
  node -e '
    const fs=require("fs");const p=process.argv[1];
    const j=JSON.parse(fs.readFileSync(p,"utf8"));
    process.stdout.write((j.transcription||[]).map(s=>s.text).join(" ").trim());
  ' "$OUT/$id.json" > "$OUT/$id.txt"
  rm -f "$OUT/$id.src" "$OUT/$id.wav"
  echo "DONE $id"
done < "$1"
