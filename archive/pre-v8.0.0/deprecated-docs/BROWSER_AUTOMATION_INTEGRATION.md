# Browser Automation Integration - Claude Code on the Web

## ✅ Working Solution

I've created `spawn_claude_web_agent.cjs` that uses **osascript to open browser tabs** to claude.ai/code.

### What It Does

1. **Opens Chrome/Safari tabs** to https://claude.ai/code (you're already logged in)
2. **Creates prompt files** for each agent
3. **Uses your Claude Pro subscription** ($0 additional cost)
4. **Runs on Anthropic's servers** (no local RAM for AI inference)

### Test Results

```bash
node spawn_claude_web_agent.cjs --simple --count 2 --output-dir /tmp/test_prompts
# ✅ Opened 2 Claude Code tabs successfully!
```

---

## Integration with automation_server.cjs

### Option 1: Fully Automated (Clipboard Auto-Paste)

Modify `spawnPhaseAgent()` function to use browser instead of iTerm2:

```javascript
// In automation_server.cjs

const { spawnClaudeWebAgent } = require('./spawn_claude_web_agent.cjs');

async function spawnPhaseAgentWeb(phase, prompt, agentId = 1) {
  console.log(`[Web Agent] Spawning Phase ${phase} agent in browser...`);

  try {
    const result = await spawnClaudeWebAgent(prompt, agentId, 'chrome');

    console.log(`[Web Agent] ✅ Phase ${phase} agent spawned in browser tab ${result.tabId}`);

    return {
      success: true,
      tabId: result.tabId,
      agentId,
      spawned: new Date()
    };

  } catch (error) {
    console.error(`[Web Agent] ❌ Failed to spawn agent:`, error);
    throw error;
  }
}
```

**Benefits**:
- ✅ Fully automated (clipboard paste into browser)
- ✅ Uses Claude Pro subscription
- ✅ No iTerm2 windows

**Limitations**:
- ⚠️ Clipboard automation can be finicky
- ⚠️ Needs to wait for page load (timing issues)

---

### Option 2: Semi-Automated (Recommended) ⭐

Dashboard creates prompts → osascript opens tabs → you manually paste:

```javascript
// New endpoint in automation_server.cjs

app.post('/api/phase5/spawn-web-agents', async (req, res) => {
  try {
    const { batchName, agentCount = 34 } = req.body;

    // 1. Load scaffolds
    const scaffoldsDir = path.join(__dirname, batchName, 'scaffolds');
    const scaffoldFiles = await fs.readdir(scaffoldsDir);

    // 2. Build prompts for each agent
    const prompts = await Promise.all(
      scaffoldFiles
        .filter(f => f.startsWith('agent_') && f.endsWith('.json'))
        .sort()
        .map(async (file, idx) => {
          const agentNum = String(idx + 1).padStart(2, '0');
          const scaffold = await fs.readJson(path.join(scaffoldsDir, file));

          return buildAgentPrompt(agentNum, scaffold);
        })
    );

    // 3. Save prompts to files
    const promptsDir = path.join(__dirname, batchName, 'prompts');
    await fs.ensureDir(promptsDir);

    await Promise.all(
      prompts.map(async (prompt, idx) => {
        const agentNum = String(idx + 1).padStart(2, '0');
        await fs.writeFile(
          path.join(promptsDir, `agent_${agentNum}_prompt.md`),
          prompt,
          'utf8'
        );
      })
    );

    // 4. Open browser tabs
    const { spawnAgentsWithPromptFiles } = require('./spawn_claude_web_agent.cjs');

    await spawnAgentsWithPromptFiles(prompts, promptsDir);

    res.json({
      success: true,
      message: `Opened ${prompts.length} Claude Code tabs`,
      promptsDir,
      instructions: [
        '1. Switch to each browser tab',
        '2. Open the corresponding prompt file',
        '3. Copy and paste into Claude Code',
        '4. Hit Enter to run',
        '5. Use Claude\'s commit feature to save output'
      ]
    });

  } catch (error) {
    console.error('[Phase 5 Web] Error spawning agents:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

function buildAgentPrompt(agentNum, scaffold) {
  return `# Phase 5 Basket Generation - Agent ${agentNum}

## Your Task

You are Agent ${agentNum}. Generate practice phrases for ${scaffold.length} LEGOs using the Phase 5 v4.1 protocol.

## Scaffold Data

<scaffold>
${JSON.stringify(scaffold, null, 2)}
</scaffold>

## Instructions

1. For each LEGO in the scaffold:
   - Generate 10 natural English phrases using this LEGO
   - Translate to Spanish using ONLY words from the whitelist
   - Vary phrase length (1-2 words, 3-5 words, 6+ words)
   - Ensure GATE compliance (use only previously taught LEGOs)

2. Validate all Spanish words are in whitelist

3. Output complete basket JSON with practice_phrases filled in

## CRITICAL Rules

- ✅ Only use Spanish words from the whitelist
- ✅ Do not invent new words
- ✅ Ensure natural, speakable phrases
- ✅ Vary sentence structure

## Output Format

Save as \`batch_output/agent_${agentNum}_baskets.json\`

Use Claude Code's commit feature to save directly to GitHub.
`;
}
```

---

### Option 3: Hybrid Automation + Smart Clipboard

Use AppleScript to:
1. Open 34 tabs
2. Auto-cycle through tabs every 5 seconds
3. Auto-paste prompt from clipboard
4. You just hit Enter in each tab

```javascript
// Advanced osascript for cycling + auto-paste

const appleScript = `
tell application "Google Chrome"
    activate

    -- Open all tabs first
    repeat with i from 1 to ${agentCount}
        tell window 1
            make new tab with properties {URL:"https://claude.ai/code"}
        end tell
        delay 1
    end repeat

    -- Now cycle through tabs and paste prompts
    repeat with i from 1 to ${agentCount}
        -- Read prompt from file
        set promptFile to "${promptsDir}/agent_" & text -2 thru -1 of ("0" & i) & "_prompt.md"
        set promptText to (do shell script "cat " & quoted form of promptFile)

        -- Copy to clipboard
        set the clipboard to promptText

        -- Switch to tab i
        set active tab index of window 1 to (i + 1)
        delay 2

        -- Paste (Cmd+V)
        tell application "System Events"
            keystroke "v" using command down
        end tell

        delay 1

        -- Optionally auto-submit (commented out for safety)
        -- tell application "System Events"
        --     keystroke return
        -- end tell

        -- Move to next tab
    end repeat

    -- Beep when done
    beep
end tell
`;
```

**Benefits**:
- ✅ Highly automated
- ✅ You just verify and hit Enter
- ✅ Uses Pro subscription

**Limitations**:
- ⚠️ Timing-sensitive
- ⚠️ Requires testing/tuning delays

---

## 🎯 Recommended Workflow

**Use Option 2 (Semi-Automated)** - Best balance of automation and control:

### Dashboard Side (10 minutes to implement)

```javascript
// Add to automation_server.cjs:

app.post('/api/phase5/spawn-web-agents', async (req, res) => {
  // ... (code from Option 2 above)
});
```

### Your Workflow (20-30 minutes for 34 agents)

1. Click "Generate Phase 5 Web Agents" in dashboard
2. Dashboard:
   - Generates 34 scaffolds
   - Creates 34 prompt files
   - Opens 34 Chrome tabs to claude.ai/code
3. You:
   - Cycle through each tab
   - Open corresponding `agent_XX_prompt.md`
   - Copy-paste into Claude Code
   - Hit Enter
   - Claude commits output automatically (or you commit manually)
4. Dashboard monitors GitHub for completed outputs

### Monitoring (Real-time in dashboard)

```javascript
// Poll GitHub for completed baskets
app.get('/api/phase5/progress/:batchName', async (req, res) => {
  const { batchName } = req.params;

  const agentStatuses = await checkAgentCompletion(batchName, 34);

  res.json({
    completed: agentStatuses.filter(a => a.status === 'completed').length,
    total: 34,
    agents: agentStatuses
  });
});
```

Dashboard UI shows live progress:
```
Phase 5 - Batch 2 Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 18/34 (53%)

✅ Agent 01  ✅ Agent 02  ✅ Agent 03  ⏳ Agent 04  ⏳ Agent 05
```

---

## Cost Savings

### Before (iTerm2 + Claude CLI)
- **Local RAM**: 34 agents × ~300MB = ~10GB
- **API Cost**: $0.01/agent × 34 = $0.34/batch
- **Monthly**: $200 (Pro) + API costs

### After (Browser + Claude Code Web)
- **Local RAM**: Just browser tabs (~2GB total)
- **API Cost**: $0 (uses Pro subscription)
- **Monthly**: $200 (Pro only)

**Savings**: ~8GB RAM + ~$0.34/batch

---

## Next Steps

1. **Test now**: Try spawning 2-3 agents manually
   ```bash
   node spawn_claude_web_agent.cjs --simple --count 3 --output-dir /tmp/test_agents
   ```

2. **Integrate**: Add `/api/phase5/spawn-web-agents` endpoint to automation_server.cjs

3. **Dashboard UI**: Add "Launch Web Agents" button

4. **Go live**: Run full 34-agent batch

Want me to implement the automation_server integration now?
