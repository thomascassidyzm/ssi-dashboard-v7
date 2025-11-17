#!/bin/bash
# Watch for new branches and automatically extract basket data

OUTPUT_DIR="public/vfs/courses/cmn_for_eng/phase5_outputs"
INITIAL_COUNT=$(git branch -r | grep "baskets-cmn_for_eng" | wc -l | xargs)

echo "🔍 Watching for new basket branches..."
echo "📊 Initial branch count: $INITIAL_COUNT"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo "----------------------------------------"

while true; do
    # Fetch new branches
    git fetch --all --quiet 2>&1 | grep -v "From" || true

    # Count current branches
    CURRENT_COUNT=$(git branch -r | grep "baskets-cmn_for_eng" | wc -l | xargs)

    if [ "$CURRENT_COUNT" -gt "$INITIAL_COUNT" ]; then
        NEW_COUNT=$((CURRENT_COUNT - INITIAL_COUNT))
        echo "✨ Found $NEW_COUNT new branch(es)! Total: $CURRENT_COUNT"

        # Get the new branches
        NEW_BRANCHES=$(git branch -r | grep "baskets-cmn_for_eng" | tail -n $NEW_COUNT)

        echo "📦 Extracting data from new branches..."
        for BRANCH in $NEW_BRANCHES; do
            echo "  Processing: $BRANCH"
            FILES=$(git ls-tree -r --name-only "$BRANCH" | grep "phase5_outputs/seed_.*_baskets.json" || true)

            if [ -n "$FILES" ]; then
                for FILE in $FILES; do
                    BASENAME=$(basename "$FILE")
                    echo "    - Extracting: $BASENAME"
                    git show "$BRANCH:$FILE" > "$OUTPUT_DIR/$BASENAME" 2>/dev/null || echo "      (failed)"
                done
            fi
        done

        SEED_COUNT=$(ls $OUTPUT_DIR/seed_S*_baskets.json 2>/dev/null | wc -l | xargs)
        echo "✅ Extraction complete! Total seeds: $SEED_COUNT"
        echo ""

        INITIAL_COUNT=$CURRENT_COUNT
    fi

    sleep 10
done
