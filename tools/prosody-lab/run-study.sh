#!/bin/bash
# prosody-lab full study run — resume-safe, concurrency-capped (≤4 everywhere).
# Run detached: nohup bash tools/prosody-lab/run-study.sh > temp/prosody-lab/run.log 2>&1 &
set -e
cd "$(dirname "$0")/../.."
mkdir -p temp/prosody-lab
echo "[$(date)] sampling + downloading"
node tools/prosody-lab/sample-pairs.cjs
echo "[$(date)] extracting features"
python3 tools/prosody-lab/prosody.py extract
echo "[$(date)] comparing pairs"
python3 tools/prosody-lab/prosody.py compare
echo "[$(date)] report"
python3 tools/prosody-lab/prosody.py report
echo "[$(date)] done"
