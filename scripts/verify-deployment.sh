#!/bin/bash
# Deployment Verification Script
# Run this before testing Phase 5 through dashboard

echo "🔍 Verifying deployment readiness..."
echo ""

# Check worker prompt
echo "1. Checking worker prompt..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md)
if [ "$STATUS" = "200" ]; then
  echo "   ✅ Worker prompt accessible (HTTP 200)"
else
  echo "   ❌ Worker prompt NOT accessible (HTTP $STATUS)"
  echo "   URL: https://ssi-dashboard-v7.vercel.app/prompts/phase5_worker.md"
  exit 1
fi

# Check Phase 5 intelligence
echo ""
echo "2. Checking Phase 5 intelligence..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md)
if [ "$STATUS" = "200" ]; then
  echo "   ✅ Phase 5 intelligence accessible (HTTP 200)"
else
  echo "   ❌ Phase 5 intelligence NOT accessible (HTTP $STATUS)"
  echo "   URL: https://ssi-dashboard-v7.vercel.app/docs/phase_intelligence/phase_5_lego_baskets.md"
  exit 1
fi

# Check local Phase 5 server
echo ""
echo "3. Checking Phase 5 server (localhost)..."
if command -v jq &> /dev/null; then
  STATUS=$(curl -s http://localhost:3459/health 2>/dev/null | jq -r '.status' 2>/dev/null)
  if [ "$STATUS" = "healthy" ]; then
    echo "   ✅ Phase 5 server running (healthy)"
  else
    echo "   ⚠️  Phase 5 server may not be running"
    echo "   Try: pm2 restart phase5-baskets"
  fi
else
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3459/health 2>/dev/null)
  if [ "$RESPONSE" = "200" ]; then
    echo "   ✅ Phase 5 server responding (HTTP 200)"
  else
    echo "   ⚠️  Phase 5 server may not be running"
    echo "   Try: pm2 restart phase5-baskets"
  fi
fi

# Check ngrok tunnel
echo ""
echo "4. Checking ngrok tunnel..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/ 2>/dev/null)
if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "404" ]; then
  echo "   ✅ Ngrok tunnel accessible"
else
  echo "   ⚠️  Ngrok tunnel may not be running"
  echo "   Check: pm2 status ngrok-tunnel"
fi

echo ""
echo "✅ Deployment verification complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Open https://ssi-dashboard-v7.vercel.app"
echo "   2. Use dashboard UI to launch Phase 5"
echo "   3. Monitor agent activity in browser"
echo ""
echo "⛔ DO NOT:"
echo "   - Test with curl http://localhost:3459/start"
echo "   - Test before Vercel deployment completes"
echo ""
