#!/usr/bin/env bash
# compact plans-src -> plans -> local build check (cs #759·AI). usage: mk.sh <course> <src.txt> <from> <to>
cd "$(dirname "$0")/../$1" || exit 1
ITEM4_NOTE="cs #759·AI" node ../eng_for_mar/mk-plans.cjs "$2" plans >/dev/null && node ../tools/build.cjs "$1" t759 "$3" "$4" 2>&1 | grep -v language-code | grep -v "^S0"; rm -f batches/t759.*
