#!/bin/bash

# Extract all Chinese basket files from git branches

echo "Extracting Chinese baskets from branches..."

rm -rf public/vfs/courses/cmn_for_eng/phase5_outputs
mkdir -p public/vfs/courses/cmn_for_eng/phase5_outputs

# List all basket branches
branches=$(git branch -r | grep 'baskets-cmn_for_eng')

count=0
for branch in $branches; do
  echo "Processing $branch..."

  # Get list of basket files in this branch
  files=$(git ls-tree -r --name-only "$branch" | grep 'phase5_outputs/seed_S.*_baskets\.json$')

  for file in $files; do
    filename=$(basename "$file")
    target="public/vfs/courses/cmn_for_eng/phase5_outputs/$filename"

    git show "$branch:$file" > "$target" 2>/dev/null && count=$((count+1))
  done
done

echo "Extracted $count basket files"
ls public/vfs/courses/cmn_for_eng/phase5_outputs/ | head -20
