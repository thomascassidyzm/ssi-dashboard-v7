# PM2 Production Setup

Robust process management for automation server + ngrok tunnel.

## Quick Start

```bash
# Stop any manually running processes
lsof -ti:3456 | xargs kill 2>/dev/null
pkill ngrok

# Start both services with PM2
pm2 start ecosystem.config.js

# View status
pm2 status

# View logs (live tail)
pm2 logs

# View logs for specific service
pm2 logs automation-server
pm2 logs ngrok-tunnel
```

## Setup for System Startup (Optional)

Configure PM2 to auto-start on Mac reboot:

```bash
# Save current PM2 process list
pm2 save

# Generate and install startup script
pm2 startup

# Follow the instructions PM2 prints (usually requires running a command with sudo)
```

Now the automation server + ngrok will automatically start when your Mac boots!

## Useful Commands

```bash
# Restart both services
pm2 restart all

# Restart specific service
pm2 restart automation-server
pm2 restart ngrok-tunnel

# Stop both services
pm2 stop all

# Delete all processes (doesn't auto-restart)
pm2 delete all

# Monitor CPU/Memory usage
pm2 monit

# Show detailed info
pm2 show automation-server

# View last 100 lines of logs
pm2 logs --lines 100
```

## Log Files

Logs are stored in `./logs/`:
- `automation-server-out.log` - Server stdout
- `automation-server-error.log` - Server errors
- `ngrok-out.log` - ngrok stdout
- `ngrok-error.log` - ngrok errors

## Updating Code

When you pull new changes:

```bash
git pull
pm2 restart automation-server
```

PM2 will restart the server with zero downtime.

## Troubleshooting

**Check if running:**
```bash
pm2 status
```

**Check logs for errors:**
```bash
pm2 logs automation-server --err
```

**Completely reset:**
```bash
pm2 delete all
pm2 start ecosystem.config.js
```

**Check ngrok tunnel URL:**
```bash
curl -s http://localhost:4040/api/tunnels | python3 -c "import sys, json; print(json.load(sys.stdin)['tunnels'][0]['public_url'])"
```
