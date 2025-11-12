# Quick Implementation Guide: Phase Intelligence APIs

**Goal**: Add phase intelligence API endpoints to existing dashboard

**Time**: ~5 minutes

---

## Step 1: Copy API Code

Open `automation_server.cjs` and find this section (around line 2820):

```javascript
app.get('/api/prompts/:phase/history', async (req, res) => {
  // ... existing code ...
});

// ← INSERT NEW CODE HERE

/**
 * GET /api/apml/full
 * Return complete APML document structure
 */
app.get('/api/apml/full', async (req, res) => {
```

**Insert the entire code block from `docs/API_PHASE_INTELLIGENCE_ENDPOINTS.md`** between these two sections.

The block starts with:
```javascript
// =============================================================================
// PHASE INTELLIGENCE API ENDPOINTS
// =============================================================================
```

And ends with:
```javascript
// =============================================================================
// END PHASE INTELLIGENCE API ENDPOINTS
// =============================================================================
```

---

## Step 2: Test the Server

```bash
# Restart server
node automation_server.cjs

# Should see in console:
# ✅ Loaded X phase prompts from APML registry
# 🚀 SSi Automation Server running on port 3456
```

---

## Step 3: Test Endpoints

```bash
# List all modules
curl http://localhost:3456/api/phase-intelligence

# Expected: {"modules":[{"phase":"3","filename":"phase_3_extraction.md",...}]}

# Fetch Phase 3
curl http://localhost:3456/api/phase-intelligence/3

# Expected: {"phase":"3","version":"2.0","content":"# Phase 3:...","source":"PHASE_INTELLIGENCE_MODULE"}

# Test fallback (Phase 1 doesn't have module yet)
curl http://localhost:3456/api/phase-intelligence/1

# Expected: {"phase":"1","content":"...","version":"1.0-legacy","source":"APML_PROMPTS_FALLBACK"}
```

---

## Step 4: Verify Git History

```bash
# Check Phase 3 history
curl http://localhost:3456/api/phase-intelligence/3/history

# Expected: {"phase":"3","history":[{...git commits...}]}
```

---

## Step 5: Test Publishing (Optional)

```bash
# Create test file
echo "# Phase 99 Test\n\n**Version**: 1.0\n**Status**: Testing" > docs/phase_intelligence/phase_99_test.md

# Publish via API
curl -X PUT http://localhost:3456/api/phase-intelligence/99 \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Phase 99 Test\n\n**Version**: 1.0\n**Status**: Testing\n\n## Test Content",
    "version": "1.0",
    "changelog": "Test publish",
    "publishedBy": "developer"
  }'

# Expected: {"success":true,"phase":"99",...}

# Verify git commit
git log -1 --oneline

# Should show: Update Phase 99 intelligence to v1.0 (developer)

# Clean up
rm docs/phase_intelligence/phase_99_test.md
git reset --hard HEAD~1
```

---

## Step 6: Agent Integration Example

Agents can now read from dashboard:

```javascript
// Old pattern (deprecated)
const prompt = PHASE_PROMPTS['3']

// New pattern (active)
const response = await fetch('http://localhost:3456/api/phase-intelligence/3')
const methodology = await response.json()
console.log(`Applying ${methodology.version} methodology`)
// Use methodology.content
```

---

## Troubleshooting

### Error: "Cannot find module 'fs-extra'"
```bash
npm install fs-extra
```

### Error: "Port 3456 already in use"
```bash
lsof -ti:3456 | xargs kill -9
node automation_server.cjs
```

### Error: "Permission denied: git commit"
Make sure git is configured:
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

---

## Success Indicators

✅ All 5 new endpoints respond:
- GET /api/phase-intelligence (list)
- GET /api/phase-intelligence/:phase (fetch)
- PUT /api/phase-intelligence/:phase (publish)
- GET /api/phase-intelligence/:phase/history (git log)
- GET /api/phase-intelligence/:phase/diff/:old/:new (git diff)

✅ Backwards compatibility works:
- GET /api/phase-intelligence/1 returns legacy fallback
- Existing /api/prompts/ endpoints still work

✅ Git integration works:
- Publishing creates commits
- History shows git log
- Diffs show changes between versions

---

## Next Steps (After Implementation)

1. **Dashboard UI** - Add phase intelligence viewer/editor
2. **Agent Migration** - Update agents to read from dashboard
3. **Module Creation** - Create modules for Phase 1, 5, 6
4. **Deprecation Timeline** - Plan removal of old PHASE_PROMPTS

---

**Total implementation time: ~5 minutes to add code + 2 minutes to test = 7 minutes**
