#!/bin/bash
# V0 + gentle low shelf (job #663): bass = 2nd-order low shelf, f=200 Hz, gain G dB, shelf slope s=0.5 (gentle),
# then a single linear gain so the clip's integrated loudness equals the ORIGINAL V0 clip's (fuller, not louder).
# usage: shelf.sh in.mp3 out.wav G
in=$1; out=$2; G=$3
L0=$(ffmpeg -nostats -hide_banner -i "$in" -af ebur128=framelog=quiet -f null - 2>&1 | grep -oE 'I:\s+-?[0-9.]+ LUFS' | tail -1 | grep -oE -- '-?[0-9.]+')
ffmpeg -v error -y -i "$in" -af "bass=g=$G:f=200:width_type=s:width=0.5" -c:a pcm_f32le "$out.tmp.wav"
L1=$(ffmpeg -nostats -hide_banner -i "$out.tmp.wav" -af ebur128=framelog=quiet -f null - 2>&1 | grep -oE 'I:\s+-?[0-9.]+ LUFS' | tail -1 | grep -oE -- '-?[0-9.]+')
ffmpeg -v error -y -i "$out.tmp.wav" -af "volume=$(python3 -c "print($L0-($L1))")dB" -c:a pcm_s16le "$out"; rm "$out.tmp.wav"
