#!/bin/bash
# Quick recovery status checker

clear
echo "🔄 Recovery Status Check"
echo "========================"
echo ""

# Count current seeds
CURRENT=$(ls public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*_baskets.json 2>/dev/null | wc -l | xargs)
PERCENT=$(echo "scale=1; $CURRENT * 100 / 668" | bc)

echo "📊 Seeds recovered: $CURRENT / 668 ($PERCENT%)"
echo "📈 Gain from start: +$(($CURRENT - 347)) seeds"
echo "🎯 Remaining: $((668 - $CURRENT)) seeds"
echo ""

# Count branches
BRANCHES=$(git branch -r | grep -c "baskets-cmn_for_eng")
echo "🌿 GitHub branches: $BRANCHES"
echo ""

# Show recent activity
echo "⏱️  Latest 5 seeds recovered:"
ls -t public/vfs/courses/cmn_for_eng/phase5_outputs/seed_S*_baskets.json 2>/dev/null | head -5 | xargs -n1 basename | sed 's/seed_/  /' | sed 's/_baskets.json//'
