#!/usr/bin/env bash
# cs #784: serial DRY RUNS (never "apply") from a list file of lines "<fam> <course> <chunk>", as a systemd user unit.
# A dropped connection is retried once after 60 s, then recorded as a gap in the log.
cd "$(dirname "$0")/.." || exit 1
while read -r fam c chunk; do
  [ -z "$fam" ] && continue
  python3 -I tools/roman_fill.py "$fam" "$c" | cut -c1-200   # a rebuilt plan loses its romanisation: fill it again first
  python3 -I tools/dryrun.py "$fam" "$c" --chunk "$chunk" | cut -c1-260 || { echo "RETRY $fam $c"; sleep 60; python3 -I tools/dryrun.py "$fam" "$c" --chunk "$chunk" | cut -c1-260 || echo "GAP $fam $c: dry run did not complete"; }
  sleep 3
done < "$1"
echo ALL-DONE
