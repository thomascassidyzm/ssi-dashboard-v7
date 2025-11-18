# Agent Basket Upload Guide

## For Claude Code on Web Agents

Instead of pushing to GitHub, agents can now **POST baskets directly to the Phase 5 server** via HTTP.

### Upload URL

```
https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket
```

### Agent Upload Code

Add this to your agent completion:

```javascript
// After generating baskets for a seed
const baskets = {
  "S0532L01": {
    "lego": ["unless they", "除非他们"],
    "type": "M",
    "practice_phrases": [
      ["Unless they", "除非他们", null, 1],
      ["Unless they can", "除非他们能", null, 2],
      // ... 10 total phrases
    ]
  },
  "S0532L02": { /* ... */ },
  // ...
};

// Upload to server
const response = await fetch('https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    course: 'cmn_for_eng',
    seed: 'S0532',
    baskets: baskets,
    agentId: 'agent-01'  // Your agent identifier
  })
});

const result = await response.json();
console.log(`✅ Uploaded ${result.legosReceived} LEGOs (${result.added} new, ${result.updated} updated)`);
console.log(`📊 Progress: ${result.progress}% (${result.totalBaskets}/${result.totalNeeded})`);
console.log(`🎯 Missing: ${result.missing} baskets remaining`);
```

### What Happens

1. **Immediate merge** - Baskets are instantly merged into `lego_baskets.json`
2. **Individual file saved** - Also saved to `phase5_outputs/seed_S0532_baskets.json`
3. **Progress tracked** - Server tracks total basket count
4. **No git required** - No branches, no pushing, no extraction

### Check Progress

```javascript
const status = await fetch('https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/basket-status/cmn_for_eng');
const data = await status.json();
console.log(`Progress: ${data.progress}% (${data.totalBaskets}/${data.totalNeeded})`);
console.log(`Missing: ${data.missing} baskets`);
console.log(`Last upload: ${data.lastSeed} by ${data.lastAgent}`);
console.log(`Active agents: ${data.activeAgents.join(', ')}`);
```

### Benefits

- ✅ **No GitHub complexity** - Just HTTP POST
- ✅ **Instant feedback** - See baskets merged immediately
- ✅ **Real-time progress** - Dashboard shows live updates
- ✅ **Works anywhere** - Any agent with internet access
- ✅ **No credentials needed** - Public endpoint

### Local Testing

```bash
# Test upload
curl -X POST https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket \
  -H "Content-Type: application/json" \
  -d '{
    "course": "cmn_for_eng",
    "seed": "S9999",
    "baskets": {
      "S9999L01": {
        "lego": ["test", "测试"],
        "type": "M",
        "practice_phrases": [["Test", "测试", null, 1]]
      }
    }
  }'

# Check status
curl https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/basket-status/cmn_for_eng
```

### For System Administrators

The ngrok tunnel must be running for agents to upload:

```bash
# Start ngrok (already running in background)
ngrok http 3459 --domain=mirthlessly-nonanesthetized-marilyn.ngrok-free.dev

# Check what's tunneled
curl http://localhost:4040/api/tunnels | jq .
```

The Phase 5 server (port 3459) must be running:

```bash
pm2 list | grep ssi-automation
```

That's it! No more GitHub branch hell. 🎉
