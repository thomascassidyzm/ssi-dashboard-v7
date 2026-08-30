#!/bin/bash
# Commit named paths to a branch WITHOUT touching HEAD or the working tree.
#
# Why this exists: this checkout is shared by several concurrent sessions and the branch moves
# under you. It moved under me once on 2026-08-18 (another session switched to
# docs/zho-mislinked-prompts-2026-08-18 mid-run). `git checkout` back would yank the tree out from
# under whoever is working; `git add` + `git commit` on the wrong branch is worse. This builds the
# commit in a throwaway index and moves the ref with a compare-and-swap, so a concurrent session
# is never disturbed and a racing update to the same branch fails loudly instead of silently
# clobbering.
#
# usage: commit-to-branch.sh <branch> <message-file> <path> [<path> ...]
set -euo pipefail

BR="$1"; shift
MSGFILE="$1"; shift
[ $# -gt 0 ] || { echo "no paths given" >&2; exit 2; }

git rev-parse --verify "$BR" >/dev/null 2>&1 || { echo "no such branch: $BR" >&2; exit 2; }
OLD=$(git rev-parse "$BR")

GIT_INDEX_FILE=$(mktemp /tmp/cbidx.XXXXXX)
export GIT_INDEX_FILE
trap 'rm -f "$GIT_INDEX_FILE"' EXIT

git read-tree "$BR"
for p in "$@"; do
  if [ -f "$p" ]; then
    BLOB=$(git hash-object -w "$p")
    MODE=100644; [ -x "$p" ] && MODE=100755
    git update-index --add --cacheinfo "$MODE,$BLOB,$p"
    echo "  staged $p"
  elif [ -d "$p" ]; then
    while IFS= read -r f; do
      BLOB=$(git hash-object -w "$f")
      MODE=100644; [ -x "$f" ] && MODE=100755
      git update-index --add --cacheinfo "$MODE,$BLOB,$f"
      echo "  staged $f"
    done < <(find "$p" -type f -not -path '*/.git/*')
  else
    echo "  MISSING, skipped: $p" >&2
  fi
done

TREE=$(git write-tree)
if [ "$TREE" = "$(git rev-parse "$BR^{tree}")" ]; then
  echo "nothing to commit — tree unchanged"; exit 0
fi

NEW=$(git commit-tree "$TREE" -p "$OLD" -F "$MSGFILE")
# compare-and-swap: fails if another session moved the branch since we read it
git update-ref "refs/heads/$BR" "$NEW" "$OLD"
echo "$BR: $OLD -> $NEW"
echo "HEAD still on: $(git rev-parse --abbrev-ref HEAD) (untouched)"
