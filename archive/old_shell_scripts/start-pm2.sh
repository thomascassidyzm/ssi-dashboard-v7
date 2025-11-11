#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "SSi Course Production - PM2 Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Stop old PM2 processes
echo "🛑 Stopping old PM2 processes..."
pm2 delete ngrok-tunnel 2>/dev/null || true
pm2 delete ssi-automation 2>/dev/null || true
pm2 delete ssi-ngrok 2>/dev/null || true

echo ""
echo "🚀 Starting new PM2 processes..."
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
pm2 start ecosystem.config.cjs

echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

echo ""
echo "✅ PM2 processes started!"
echo ""
echo "═══════════════════════════════════════════════════════════════"
pm2 list
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Verify processes are running: pm2 list"
echo "  2. View logs: pm2 logs"
echo "  3. Monitor: pm2 monit"
echo "  4. Dashboard: https://ssi-dashboard-v7.vercel.app"
echo "  5. ngrok URL: https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev"
echo ""
echo "To enable auto-start on Mac boot:"
echo "  pm2 startup"
echo "  (then run the command it gives you)"
echo ""
