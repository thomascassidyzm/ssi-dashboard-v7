# PM2 Process Management

PM2 configuration for SSI Dashboard automation services.

## Services

| Service | Port | Description |
|---------|------|-------------|
| **ssi-automation** | 3456+ | Main orchestrator + all phase servers (3456-3461) |
| **dashboard-ui** | 5173 | Vite dev server for React dashboard |
| **ngrok-tunnel** | - | Exposes Phase 5 (port 3459) to internet |
| **progress-api** | 3462 | Unified progress tracking API |

### Port Allocation

- **3456**: Orchestrator
- **3457**: Phase 1 (Translation)
- **3458**: Phase 3 (LEGO Extraction)
- **3459**: Phase 5 (Basket Generation) ← **ngrok exposes this**
- **3460**: Phase 6 (Introductions)
- **3461**: Phase 8 (Audio)
- **3462**: Progress API

## Quick Commands

### Start Services

```bash
# Start all services
pm2 start ecosystem.config.cjs

# Start specific service
pm2 start ecosystem.config.cjs --only progress-api
pm2 start ecosystem.config.cjs --only ssi-automation
pm2 start ecosystem.config.cjs --only dashboard-ui
pm2 start ecosystem.config.cjs --only ngrok-tunnel
```

### Monitor Services

```bash
# List all processes
pm2 list

# Real-time monitoring dashboard
pm2 monit

# View logs for specific service
pm2 logs progress-api
pm2 logs ssi-automation
pm2 logs ngrok-tunnel

# View last 100 lines
pm2 logs progress-api --lines 100

# Follow specific log file
pm2 logs progress-api --nostream
```

### Control Services

```bash
# Restart service
pm2 restart progress-api
pm2 restart ssi-automation

# Restart all
pm2 restart all

# Stop service
pm2 stop progress-api

# Stop all
pm2 stop all

# Delete service
pm2 delete progress-api

# Delete all
pm2 delete all

# Reload (zero-downtime restart)
pm2 reload progress-api
```

### Save & Startup

```bash
# Save current process list
pm2 save

# Generate startup script (run once)
pm2 startup

# Disable auto-start
pm2 unstartup
```

## Service Details

### ssi-automation

Runs `start-automation.cjs` which spawns all phase servers:

- **Orchestrator** (3456) - Coordinates multi-agent work
- **Phase 1** (3457) - Seed translation
- **Phase 3** (3458) - LEGO extraction
- **Phase 5** (3459) - Basket generation + HTTP upload endpoint
- **Phase 6** (3460) - Introduction generation
- **Phase 8** (3461) - Audio generation

**Environment variables:**
- `PORT=3456`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`
- `ANTHROPIC_API_KEY`

**Logs:**
- Error: `logs/automation-server-error.log`
- Output: `logs/automation-server-out.log`

### dashboard-ui

Runs `npm run dev` for Vite development server.

**Environment variables:**
- `NODE_ENV=development`
- `VITE_API_BASE_URL=http://localhost:3456`

**Logs:**
- Error: `logs/dashboard-error.log`
- Output: `logs/dashboard-out.log`

### ngrok-tunnel

Exposes Phase 5 basket upload endpoint to the internet.

**Public URL:**
```
https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev
```

**Tunnels to:** `http://localhost:3459` (Phase 5 server)

**Command:**
```bash
ngrok http --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev 3459 --log=stdout
```

**Logs:**
- Error: `logs/ngrok-error.log`
- Output: `logs/ngrok-out.log`

**Check tunnel status:**
```bash
curl http://localhost:4040/api/tunnels | jq .
```

### progress-api

Unified progress tracking across all phases.

**Port:** 3462

**Environment variables:**
- `PORT=3462`
- `VFS_ROOT=/path/to/public/vfs/courses`

**Endpoints:**
- `GET /api/progress/:course` - All phases
- `GET /api/progress/:course/:phase` - Specific phase
- `GET /health` - Health check

**Logs:**
- Error: `logs/progress-api-error.log`
- Output: `logs/progress-api-out.log`

## Troubleshooting

### Service Won't Start

```bash
# Check if port is in use
lsof -i :3462

# View error logs
pm2 logs progress-api --err --lines 50

# Delete and restart
pm2 delete progress-api
pm2 start ecosystem.config.cjs --only progress-api
```

### High Memory Usage

```bash
# Check memory
pm2 list

# Restart service to free memory
pm2 restart ssi-automation

# Adjust memory limit in ecosystem.config.cjs
# max_memory_restart: '500M'
```

### Logs Not Appearing

```bash
# Flush logs
pm2 flush

# Restart with fresh logs
pm2 restart all --update-env
```

### ngrok Tunnel Down

```bash
# Check ngrok status
pm2 logs ngrok-tunnel --lines 20

# Restart tunnel
pm2 restart ngrok-tunnel

# Verify tunnel is up
curl http://localhost:4040/api/tunnels | jq '.tunnels[0].public_url'
```

### Environment Variables Not Loading

```bash
# Ensure .env file exists in project root
cat .env

# Restart with updated env
pm2 restart all --update-env

# Check loaded environment
pm2 env 0  # Replace 0 with process id
```

## Configuration File

The PM2 ecosystem configuration is in `ecosystem.config.cjs`:

```javascript
module.exports = {
  apps: [
    {
      name: 'ssi-automation',
      script: 'start-automation.cjs',
      env: {
        PORT: 3456,
        // ...
      }
    },
    {
      name: 'progress-api',
      script: 'services/api/progress-tracker.cjs',
      env: {
        PORT: 3462,
        VFS_ROOT: require('path').join(__dirname, 'public/vfs/courses')
      }
    }
    // ...
  ]
};
```

To modify configuration:
1. Edit `ecosystem.config.cjs`
2. Delete old processes: `pm2 delete all`
3. Start with new config: `pm2 start ecosystem.config.cjs`
4. Save: `pm2 save`

## Production Setup

For production deployment on a server:

```bash
# 1. Install PM2 globally
npm install -g pm2

# 2. Clone repository
git clone <repo-url>
cd ssi-dashboard-v7-clean

# 3. Install dependencies
npm install

# 4. Create .env file with credentials
cat > .env <<EOF
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
S3_BUCKET=your-bucket
ANTHROPIC_API_KEY=your_key
EOF

# 5. Start all services
pm2 start ecosystem.config.cjs

# 6. Save configuration
pm2 save

# 7. Set up auto-start on system boot
pm2 startup
# Run the command it outputs

# 8. Verify services are running
pm2 list
pm2 logs --lines 50
```

## Monitoring & Maintenance

### Daily Checks

```bash
# Check all services are online
pm2 list

# Check memory usage
pm2 monit

# Review error logs
pm2 logs --err --lines 100
```

### Weekly Maintenance

```bash
# Clear old logs
pm2 flush

# Restart services to free memory
pm2 restart all

# Update PM2 if needed
npm install -g pm2@latest
pm2 update
```

### When Deploying Updates

```bash
# Pull latest code
git pull origin main

# Install new dependencies
npm install

# Restart services with new code
pm2 restart all --update-env

# Check for errors
pm2 logs --lines 50
```

---

**Last Updated:** 2025-11-18
