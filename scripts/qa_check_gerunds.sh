#!/bin/bash
# QA Check: Verify no gerund-requiring verbs are followed by infinitives

echo "=== GERUND COMPLIANCE CHECK ==="
echo ""
echo "Checking for incorrect patterns where gerund-only verbs are followed by infinitives..."
echo ""

# Gerund-only verbs that MUST be followed by -ing form, NOT infinitive
VIOLATIONS=0

# Check for "enjoy to"
COUNT=$(grep -r "enjoy to " public/vfs/courses/*/baskets/*.json 2>/dev/null | grep -v "trying to" | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "❌ Found $COUNT instances of 'enjoy to' (should be 'enjoy [verb-ing]'):"
  grep -r "enjoy to " public/vfs/courses/*/baskets/*.json | grep -v "trying to" | head -5
  VIOLATIONS=$((VIOLATIONS + COUNT))
  echo ""
fi

# Check for "finish to"
COUNT=$(grep -r "finish to " public/vfs/courses/*/baskets/*.json 2>/dev/null | grep -v "trying to" | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "❌ Found $COUNT instances of 'finish to' (should be 'finish [verb-ing]'):"
  grep -r "finish to " public/vfs/courses/*/baskets/*.json | grep -v "trying to" | head -5
  VIOLATIONS=$((VIOLATIONS + COUNT))
  echo ""
fi

# Check for "keep to"
COUNT=$(grep -r "keep to " public/vfs/courses/*/baskets/*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "❌ Found $COUNT instances of 'keep to' (should be 'keep [verb-ing]'):"
  grep -r "keep to " public/vfs/courses/*/baskets/*.json | head -5
  VIOLATIONS=$((VIOLATIONS + COUNT))
  echo ""
fi

# Check for "mind to"
COUNT=$(grep -r "mind to " public/vfs/courses/*/baskets/*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "❌ Found $COUNT instances of 'mind to' (should be 'mind [verb-ing]'):"
  grep -r "mind to " public/vfs/courses/*/baskets/*.json | head -5
  VIOLATIONS=$((VIOLATIONS + COUNT))
  echo ""
fi

# Check for "avoid to"
COUNT=$(grep -r "avoid to " public/vfs/courses/*/baskets/*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "❌ Found $COUNT instances of 'avoid to' (should be 'avoid [verb-ing]'):"
  grep -r "avoid to " public/vfs/courses/*/baskets/*.json | head -5
  VIOLATIONS=$((VIOLATIONS + COUNT))
  echo ""
fi

# Check for "consider to"
COUNT=$(grep -r "consider to " public/vfs/courses/*/baskets/*.json 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt 0 ]; then
  echo "❌ Found $COUNT instances of 'consider to' (should be 'consider [verb-ing]'):"
  grep -r "consider to " public/vfs/courses/*/baskets/*.json | head -5
  VIOLATIONS=$((VIOLATIONS + COUNT))
  echo ""
fi

echo "=== SUMMARY ==="
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✅ PASSED: No gerund violations found!"
  echo "   All gerund-requiring verbs are correctly followed by -ing forms."
  exit 0
else
  echo "❌ FAILED: Found $VIOLATIONS gerund violations"
  echo "   Fix these by converting infinitive to gerund form."
  exit 1
fi
