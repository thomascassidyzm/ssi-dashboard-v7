#!/bin/bash

# Restructure Phase 5 outputs from /segments/ to /phase5_outputs/
# For Kai's branch: claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K

set -e

COURSE_DIR="public/vfs/courses/cmn_for_eng"
SEGMENTS_DIR="$COURSE_DIR/segments"
OUTPUT_DIR="$COURSE_DIR/phase5_outputs"

echo "🔧 Restructuring Phase 5 outputs for cmn_for_eng"
echo "================================================"

# Create phase5_outputs directory
mkdir -p "$OUTPUT_DIR"
echo "✅ Created: $OUTPUT_DIR"

# Copy all agent outputs to phase5_outputs with proper naming
# Agent outputs are named agent_XX_output.json and should become agent_XX_provisional.json

total_files=0

for segment in {1..7}; do
  segment_dir="$SEGMENTS_DIR/segment_$segment"

  if [ ! -d "$segment_dir" ]; then
    echo "⚠️  Segment $segment directory not found, skipping..."
    continue
  fi

  echo ""
  echo "📂 Processing Segment $segment..."

  for file in "$segment_dir"/agent_*.json; do
    if [ -f "$file" ]; then
      # Extract agent number from filename
      basename_file=$(basename "$file")
      agent_num=$(echo "$basename_file" | sed 's/agent_0*//' | sed 's/agent_//' | sed 's/_output.json//')

      # Calculate seed range for logging (10 seeds per agent, last agent has 8)
      start_seed=$(( (10#$agent_num - 1) * 10 + 1 ))

      if [ "$agent_num" -eq 67 ]; then
        end_seed=668
        seed_count=8
      else
        end_seed=$(( start_seed + 9 ))
        seed_count=10
      fi

      # Create output filename
      output_file="$OUTPUT_DIR/agent_${agent_num}_provisional.json"

      # Copy file
      cp "$file" "$output_file"

      echo "  ✓ Agent $agent_num: S$(printf '%04d' $start_seed)-S$(printf '%04d' $end_seed) ($seed_count seeds)"

      total_files=$((total_files + 1))
    fi
  done
done

echo ""
echo "================================================"
echo "✅ Restructuring complete!"
echo "📊 Total files copied: $total_files"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. git add $OUTPUT_DIR"
echo "2. git commit -m \"Phase 5: Restructure outputs to phase5_outputs directory\""
echo "3. git push origin claude/spawn-phase5-orchestrator-0153z82ToHP4aovyghtvm34K"
echo "4. node scripts/phase5_merge_baskets.cjs $COURSE_DIR"
echo ""
echo "Files in output directory:"
ls -1 "$OUTPUT_DIR" | head -10
echo "... (showing first 10 files)"
echo ""
echo "Total: $(ls -1 "$OUTPUT_DIR" | wc -l) files"
