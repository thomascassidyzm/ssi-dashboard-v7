# Kai - osascript Permissions Setup

## What This Is For

The automation server needs permission to open browser windows automatically when you start a course generation. This uses macOS's `osascript` (AppleScript) to control your browser.

Without these permissions, the automation won't be able to open Claude Code on Web in your browser.

---

## ⚠️ CRITICAL: Grant Terminal/iTerm2 Permissions

### Step 1: Open System Settings

1. Click the Apple menu () → **System Settings**
2. Go to **Privacy & Security**
3. Scroll down and click **Automation**

### Step 2: Grant Permissions to Your Terminal App

Find your terminal app in the list (Terminal.app or iTerm.app) and enable:

**For Terminal.app:**
- ✅ **System Events** (required)
- ✅ **Finder** (optional but helpful)

**For iTerm.app:**
- ✅ **System Events** (required)
- ✅ **Finder** (optional but helpful)

### Step 3: Grant Accessibility Permissions

1. Still in **Privacy & Security**
2. Click **Accessibility** (in the left sidebar)
3. Look for your terminal app (Terminal.app or iTerm.app)
4. If it's there, make sure the checkbox is **ON** ✅
5. If it's NOT there, you need to trigger a permission request first

---

## 🧪 Test osascript Permissions

Run this test command in your terminal:

```bash
osascript -e 'tell application "Safari" to activate'
```

### Expected Results:

**✅ SUCCESS:** Safari opens/comes to front
- Permissions are working!
- You're ready to use the automation

**❌ FAILURE:** Error message like:
```
execution error: Not authorized to send Apple events to Safari. (-1743)
```
- Permissions not granted yet
- Follow the steps above again
- You may need to restart your terminal after granting permissions

---

## 🔐 Alternative: Grant Permissions by Running PM2

Sometimes macOS won't show the permission dialog until you actually try to use osascript through PM2.

### Try This:

1. **Start the automation server:**
   ```bash
   cd ~/SSi/ssi-dashboard-v7-clean
   pm2 start ecosystem.config.kai.cjs
   ```

2. **Trigger a permission request:**
   - Go to the dashboard: https://ssi-dashboard-v7.vercel.app
   - Select "Kai's Machine" from dropdown
   - Try to start a course generation

3. **Watch for the permission dialog:**
   - macOS should show a popup asking for permissions
   - Click **"Allow"** or **"OK"**

4. **Grant the permissions in System Settings:**
   - Go to System Settings → Privacy & Security → Automation
   - Enable the permissions for your terminal app

5. **Restart PM2:**
   ```bash
   pm2 restart all
   ```

---

## 🌐 Browser-Specific Setup

### For Safari:

Test:
```bash
osascript -e 'tell application "Safari" to activate'
```

### For Chrome:

Test:
```bash
osascript -e 'tell application "Google Chrome" to activate'
```

### For Arc:

Test:
```bash
osascript -e 'tell application "Arc" to activate'
```

If you get an error, you need to grant automation permissions for that specific browser.

---

## 📋 Full Checklist

- [ ] System Settings → Privacy & Security → Automation → Terminal/iTerm → System Events ✅
- [ ] System Settings → Privacy & Security → Accessibility → Terminal/iTerm ✅ (if needed)
- [ ] Test osascript: `osascript -e 'tell application "Safari" to activate'`
- [ ] Restart terminal (if you just granted permissions)
- [ ] Restart PM2: `pm2 restart all`
- [ ] Test automation from dashboard

---

## 🔍 Troubleshooting

### "Not authorized to send Apple events"

**Solution:**
1. Go to System Settings → Privacy & Security → Automation
2. Find your terminal app (Terminal or iTerm)
3. Enable **System Events** ✅
4. Restart your terminal
5. Restart PM2: `pm2 restart all`

### "Operation not permitted"

**Solution:**
1. Go to System Settings → Privacy & Security → Accessibility
2. Look for your terminal app
3. Toggle it OFF then ON again
4. Or click the **+** button and add your terminal app
5. Restart terminal and PM2

### Permission dialog doesn't appear

**Solution:**
1. Close System Settings completely
2. Run the test osascript command again
3. The dialog should appear immediately
4. If not, restart your Mac (this resets permission states)

### Works in terminal but not through PM2

**Solution:**
PM2 might be running under a different context. Try:

```bash
# Stop PM2
pm2 stop all
pm2 delete all

# Kill PM2 daemon
pm2 kill

# Start fresh
pm2 start ecosystem.config.kai.cjs

# Check logs
pm2 logs
```

---

## 🎯 What Success Looks Like

When everything is working correctly:

1. You start a course generation from the dashboard
2. The automation server receives the request
3. osascript opens a new browser window automatically
4. Claude Code on Web loads with your task
5. You see the Claude interface ready to work

You should see in the PM2 logs:
```
Opening Claude Code on Web for Phase X...
Browser command executed successfully
```

NOT:
```
Error executing osascript
Not authorized to send Apple events
```

---

## 💡 Pro Tips

1. **Use Chrome or Safari** - These have the best osascript support
2. **Grant permissions BEFORE starting PM2** - Easier to get the dialogs
3. **Restart terminal after granting permissions** - macOS needs to refresh
4. **Check PM2 logs** - `pm2 logs automation-server` shows osascript errors

---

## 🆘 Still Not Working?

If you've done everything above and it still doesn't work:

1. **Check PM2 logs:**
   ```bash
   pm2 logs automation-server --lines 50
   ```

2. **Look for these errors:**
   - "Not authorized to send Apple events"
   - "Operation not permitted"
   - "osascript: command not found" (shouldn't happen, but check)

3. **Try manual osascript test:**
   ```bash
   # This should open Safari
   osascript -e 'tell application "Safari" to make new document'
   ```

4. **Contact Tom** with:
   - Output of `pm2 logs automation-server`
   - Screenshot of System Settings → Privacy & Security → Automation
   - Which terminal app you're using (Terminal or iTerm)
   - Which browser you want to use

---

## 📝 Summary

**What you need:**
- ✅ Terminal/iTerm automation permission for System Events
- ✅ Terminal/iTerm accessibility permission (sometimes)
- ✅ PM2 running with correct permissions

**How to test:**
```bash
osascript -e 'tell application "Safari" to activate'
```

**If it works:**
- Safari opens ✅
- You're ready to use the automation ✅

**If it doesn't work:**
- Grant permissions in System Settings
- Restart terminal
- Restart PM2
- Try again

Once this is working, the automation will be able to open Claude Code on Web automatically when you start course generation! 🚀
