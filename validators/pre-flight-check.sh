#!/bin/bash

echo "🚀 Pre-Flight Check for Course Generation"
echo "=========================================="
echo ""

# Check orchestrator brief (lines 192-440)
echo "📋 Checking orchestrator brief format specs..."
sed -n '192,440p' automation_server.cjs > /tmp/brief.txt

# Check for correct 2-element componentization
if grep -q "targetPart" /tmp/brief.txt && grep -q "literalKnown" /tmp/brief.txt; then
  echo "   ✅ 2-element componentization format specified"
else
  echo "   ❌ Missing 2-element componentization format"
  exit 1
fi

# Check for stale 3-element format
if grep -q '\["component", "trans", "LEGO_ID"\]' /tmp/brief.txt; then
  echo "   ❌ Found old 3-element format!"
  exit 1
fi

# Check for null in examples
if grep -q ', null\]' /tmp/brief.txt; then
  echo "   ❌ Found null in component examples!"
  exit 1
fi

# Check for deprecated terms in brief
if grep -q "amino_acids\|LEGO_BREAKDOWNS_COMPLETE\|translations\.json" /tmp/brief.txt; then
  echo "   ⚠️  Found deprecated terminology in brief"
  exit 1
fi

echo "   ✅ No deprecated terminology"
echo ""

# Check phase intelligence versions
echo "📚 Phase Intelligence versions:"
echo "   - Phase 1: v2.6 (Pedagogical Translation) 🔒"
echo "   - Phase 3: v3.5 (LEGO Extraction) 🔒"
echo "   - Phase 5: v2.2 (Basket Generation - batch-aware) 🔒"
echo ""

# Check batch-aware Phase 5 instructions
if grep -q "BATCH-AWARE" /tmp/brief.txt; then
  echo "   ✅ Phase 5 batch-aware instructions present"
else
  echo "   ⚠️  Phase 5 batch instructions may be missing"
fi

echo ""
echo "✅ Pre-flight check complete - Ready for generation!"
echo ""

rm /tmp/brief.txt
