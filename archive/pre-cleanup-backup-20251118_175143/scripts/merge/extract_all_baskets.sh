#!/bin/bash

# Extract all basket files from recent branches
OUTPUT_DIR="public/vfs/courses/cmn_for_eng/phase5_outputs"
mkdir -p "$OUTPUT_DIR"

# Get all recent baskets-cmn_for_eng branches
BRANCHES=$(git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin | grep "baskets-cmn_for_eng" | grep -v "HEAD")

echo "Found $(echo "$BRANCHES" | wc -l) branches to process"

for BRANCH in $BRANCHES; do
    echo "Processing: $BRANCH"

    # List all basket files in this branch
    FILES=$(git ls-tree -r --name-only "$BRANCH" | grep "phase5_outputs/seed_.*_baskets.json" || true)

    if [ -n "$FILES" ]; then
        for FILE in $FILES; do
            BASENAME=$(basename "$FILE")
            echo "  - Extracting: $BASENAME"
            git show "$BRANCH:$FILE" > "$OUTPUT_DIR/$BASENAME" 2>/dev/null || echo "    (failed, might not exist)"
        done
    fi
done

echo ""
echo "Extraction complete! Files in $OUTPUT_DIR:"
ls -1 "$OUTPUT_DIR"/seed_*_baskets.json | wc -l
