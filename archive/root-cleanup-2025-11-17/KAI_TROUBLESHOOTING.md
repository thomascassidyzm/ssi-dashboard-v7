# Kai's Machine Troubleshooting Guide

## Issue: Browser fetching from Vercel instead of local ngrok tunnel

### Problem
Browser console shows errors like:
```
HEAD https://ssi-dashboard-v7.vercel.app/vfs/courses/... 404 (Not Found)
```

This means you're accessing the **production Vercel site** instead of your **local ngrok tunnel**.

### Solution

1. **Find your ngrok tunnel URL:**
   ```bash
   # In the terminal where ngrok is running, look for the URL
   # It should look like: https://YOUR-SUBDOMAIN.ngrok-free.app
   ```

2. **Open THAT URL in your browser, NOT ssi-dashboard-v7.vercel.app**
   - ✅ Correct: `https://YOUR-SUBDOMAIN.ngrok-free.app`
   - ❌ Wrong: `https://ssi-dashboard-v7.vercel.app`

3. **Verify it's working:**
   - The green light in the dashboard confirms the tunnel is connected
   - But you need to **browse TO the tunnel URL** to see local files
   - When you access via ngrok, the `/vfs/courses/...` requests will go to YOUR local machine

### How the system works:

```
Browser → ngrok URL → Your Local Machine → Your Local Files
  ✓         ✓              ✓                    ✓

Browser → Vercel URL → Vercel Server → Missing Files (404)
  ✓           ✓              ✓              ✗
```

### Current Setup Status:

**Tom's reserved ngrok URL:** `https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev`
**Kai's ngrok URL:** You need to find this in your ngrok terminal output

### Quick Check:

1. Is ngrok running? (You said green light is on ✓)
2. What URL is ngrok showing in the terminal?
3. Are you accessing the dashboard through THAT URL in your browser?

### If you need to check what URL ngrok is using:

```bash
# If using ngrok http command:
ngrok http 3456 --domain=YOUR-DOMAIN.ngrok-free.app

# The terminal will show:
# Forwarding   https://YOUR-DOMAIN.ngrok-free.app -> http://localhost:3456
```

Copy the `https://YOUR-DOMAIN.ngrok-free.app` URL and open it in your browser!
