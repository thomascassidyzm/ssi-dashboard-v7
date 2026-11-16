#!/usr/bin/env bash
# Rebuilds the UNHEARD cym_n S0272L05 intro splice (cs #204·AI). Recipe and measurements: splice-recipe.tsv. Writes to $1 (default ./out).
set -euo pipefail
OUT=${1:-./out}; mkdir -p "$OUT"; cd "$OUT"
S=https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered
A=D0BA506B-1D65-4200-85B2-690960B703B4.mp3; B=13361AD6-6847-4293-8AF9-35AB98CCF45D.mp3
curl -sf -o $A $S/$A; curl -sf -o $B $S/$B
ffmpeg -v error -y -i $A -i $B -filter_complex "\
[0:a]atrim=0:7.150,asetpts=PTS-STARTPTS,afade=t=out:st=7.140:d=0.010[a];\
[0:a]atrim=6.850:6.880,asetpts=PTS-STARTPTS[g];\
[1:a]atrim=0:1.970,asetpts=PTS-STARTPTS,volume=0dB,afade=t=in:st=0:d=0.005,afade=t=out:st=1.900:d=0.070[b];\
[0:a]atrim=6.800:7.050,asetpts=PTS-STARTPTS[t];\
[a][g][b][t]concat=n=4:v=0:a=1[o]" -map "[o]" -ar 44100 -ac 1 -c:a libmp3lame -b:a 128k angry-eyes-intro-splice-204.mp3
ffmpeg -nostats -i angry-eyes-intro-splice-204.mp3 -af ebur128=peak=true -f null - 2>&1 | grep -E 'I:|Peak:' | tail -2
