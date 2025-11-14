#!/bin/bash

# Test osascript permissions for Kai's machine
# This verifies that the automation server can open browser windows

echo "🧪 Testing osascript Permissions"
echo "================================"
echo ""

# Test 1: Basic osascript
echo "Test 1: Basic osascript command..."
if osascript -e 'return "Hello"' > /dev/null 2>&1; then
    echo "✅ osascript works"
else
    echo "❌ osascript failed - check if osascript is installed"
    exit 1
fi
echo ""

# Test 2: Safari activation
echo "Test 2: Can control Safari..."
if osascript -e 'tell application "Safari" to activate' > /dev/null 2>&1; then
    echo "✅ Safari control works (Safari should have opened)"
else
    echo "❌ Safari control failed"
    echo "   Error: Not authorized to send Apple events"
    echo ""
    echo "   Fix: Go to System Settings → Privacy & Security → Automation"
    echo "        Enable System Events for your Terminal app"
    exit 1
fi
echo ""

# Test 3: Chrome activation (if installed)
echo "Test 3: Can control Chrome..."
if [ -d "/Applications/Google Chrome.app" ]; then
    if osascript -e 'tell application "Google Chrome" to activate' > /dev/null 2>&1; then
        echo "✅ Chrome control works"
    else
        echo "⚠️  Chrome control failed (but Chrome is installed)"
        echo "   You may need to grant permissions for Chrome too"
    fi
else
    echo "ℹ️  Chrome not installed (skipping)"
fi
echo ""

# Test 4: Opening a URL
echo "Test 4: Can open URL in browser..."
TEST_URL="https://claude.ai"
if osascript -e "open location \"$TEST_URL\"" > /dev/null 2>&1; then
    echo "✅ URL opening works (claude.ai should have opened)"
else
    echo "❌ URL opening failed"
    exit 1
fi
echo ""

# Test 5: System Events access
echo "Test 5: Can access System Events..."
if osascript -e 'tell application "System Events" to return name of first process' > /dev/null 2>&1; then
    echo "✅ System Events access works"
else
    echo "❌ System Events access failed"
    echo "   Fix: Go to System Settings → Privacy & Security → Automation"
    echo "        Enable System Events for your Terminal app"
    exit 1
fi
echo ""

echo "================================"
echo "✨ All tests passed!"
echo ""
echo "Your osascript permissions are correctly configured."
echo "The automation server will be able to open Claude Code on Web."
echo ""
echo "Next steps:"
echo "1. Start PM2: pm2 start ecosystem.config.kai.cjs"
echo "2. Test automation from dashboard"
