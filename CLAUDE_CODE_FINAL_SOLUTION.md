# Claude Code: Final Solution Analysis

## What We Discovered

### ✅ Claude CLI Does Use Anthropic's Servers
- **AI inference happens on Anthropic's servers**, not locally
- Local RAM usage (9.8GB) is just process overhead and context caching
- Network monitoring shows HTTPS connections to Anthropic (34.36.57.103:443)

### ❌ BUT It Uses Paid API, Not Your Pro Subscription
```json
{
  "total_cost_usd": 0.008636,
  "modelUsage": {
    "claude-sonnet-4-5-20250929": {
      "inputTokens": 2,
      "outputTokens": 80,
      "costUSD": 0.0085155
    }
  }
}
```

**Each Phase 5 basket generation would cost ~$0.01 × 34 agents = $0.34 per batch**

This defeats the purpose of your **$200/month Claude Pro subscription**, which includes:
- ✅ Unlimited Claude.ai web usage
- ✅ Unlimited Claude Code on the Web (browser at claude.ai/code)
- ❌ **Does NOT cover** Claude CLI API calls (charged separately)

---

## The Problem: No Programmatic API for Claude Code on the Web

After extensive research, **Claude Code on the Web (browser-based) has NO programmatic API** to trigger sessions remotely.

Your options:

---

## 🎯 RECOMMENDED SOLUTION: Hybrid Manual/Automated Approach

Since you're already comfortable with Claude Code on the Web and it's included in your Pro subscription, here's the optimal workflow:

### Phase 1: Dashboard Automation (10 minutes to implement)
Dashboard generates all 34 prompts and scaffolds:

```javascript
// dashboard/api/phase5/prepare-batch.js

export async function POST(req) {
  const { batchName, seedRange } = await req.json();

  // 1. Run scaffold generation script
  const scaffolds = await generateScaffolds(batchName, seedRange);

  // 2. Commit scaffolds to GitHub
  await commitToGitHub(
    scaffolds.map((s, i) => ({
      path: `${batchName}/scaffolds/agent_${String(i+1).padStart(2,'0')}_scaffold.json`,
      content: JSON.stringify(s, null, 2)
    })),
    `Phase 5: Generate ${scaffolds.length} scaffolds for ${batchName}`
  );

  // 3. Create master prompt file with all agent tasks
  const masterPrompt = buildMasterPrompt(batchName, scaffolds.length);

  await commitToGitHub([
    {
      path: `${batchName}/MASTER_PROMPT.md`,
      content: masterPrompt
    }
  ], `Phase 5: Create master prompt for ${batchName}`);

  return {
    success: true,
    scaffoldsCreated: scaffolds.length,
    promptUrl: `https://github.com/thomascassidyzm/ssi-dashboard-v7/blob/main/${batchName}/MASTER_PROMPT.md`
  };
}

function buildMasterPrompt(batchName, agentCount) {
  return `# Phase 5 Basket Generation: ${batchName}

## Instructions
Generate practice phrases for all ${agentCount} agents in parallel using Claude Code on the Web.

${Array.from({ length: agentCount }, (_, i) => {
  const agentId = i + 1;
  const agentNum = String(agentId).padStart(2, '0');

  return `
### Agent ${agentNum}

**Scaffold**: [agent_${agentNum}_scaffold.json](scaffolds/agent_${agentNum}_scaffold.json)

**Output**: Commit to \`batch_output/agent_${agentNum}_baskets.json\`

**Prompt**:
\`\`\`
You are Agent ${agentNum}. Load the scaffold above and generate practice phrases for all LEGOs following the Phase 5 v4.1 protocol:

1. Read scaffold JSON (contains whitelists and empty practice_phrases arrays)
2. For each LEGO in the basket:
   - Generate 10 natural English phrases using this LEGO
   - Translate to Spanish using ONLY words from the whitelist
   - Vary phrase length (1-2 words, 3-5 words, 6+ words)
   - Ensure GATE compliance (use only previously taught LEGOs)
3. Validate all Spanish words are in whitelist
4. Output complete basket JSON with practice_phrases filled in

CRITICAL: Only use Spanish words from the whitelist. Do not invent new words.
\`\`\`
`;
}).join('\n---\n')}

## Progress Tracker

${Array.from({ length: agentCount }, (_, i) => {
  const agentNum = String(i + 1).padStart(2, '0');
  return `- [ ] Agent ${agentNum}`;
}).join('\n')}

## How to Execute

### Option A: 34 Parallel Tabs (Fastest - 20 minutes total)
1. Open Claude Code on the Web 34 times (in batches if needed)
2. For each tab:
   - Copy the agent's prompt above
   - Paste into Claude Code
   - Add scaffold file to context
   - Hit Run
   - Use Claude's commit feature to save to batch_output/
3. Check off completed agents above

### Option B: Sequential (Slower - 2-3 hours)
1. Open Claude Code on the Web once
2. Run Agent 01 prompt → commit
3. Run Agent 02 prompt → commit
4. ... repeat 34 times

Your Pro subscription covers unlimited parallel sessions!
`;
}
```

### Phase 2: Your Manual Workflow (20-30 minutes for 34 agents)

**Option A: Maximum Parallelism (Use your $200/month Pro subscription fully!)**
1. Dashboard creates `MASTER_PROMPT.md` with all 34 agent instructions
2. You open 34 browser tabs to `claude.ai/code` (or batches of 10-15 if 34 is too many)
3. Each tab gets one agent's prompt
4. You hit "Run" in each tab
5. Each Claude session commits its output automatically
6. Dashboard monitors GitHub for completed `agent_*_baskets.json` files

**Option B: Semi-Automated (If 34 tabs is too much)**
1. Open 5-10 tabs at a time
2. Run them in batches
3. Takes 4-5 rounds instead of 1

### Phase 3: Dashboard Monitoring (Real-time)

```javascript
// dashboard/api/phase5/monitor-progress.js

export async function GET(req) {
  const { batchName } = await req.query;

  const agentStatuses = await Promise.all(
    Array.from({ length: 34 }, async (_, i) => {
      const agentNum = String(i + 1).padStart(2, '0');
      const outputPath = `${batchName}/batch_output/agent_${agentNum}_baskets.json`;

      // Check if file exists in GitHub repo
      const exists = await checkGitHubFileExists(outputPath);

      if (exists) {
        const content = await fetchGitHubFile(outputPath);
        const basket = JSON.parse(content);

        // Quick validation
        const isValid = basket.every(lego =>
          lego.practice_phrases &&
          lego.practice_phrases.length === 10
        );

        return {
          agentId: i + 1,
          status: isValid ? 'completed' : 'invalid',
          outputPath,
          legoCount: basket.length
        };
      }

      return {
        agentId: i + 1,
        status: 'pending',
        outputPath
      };
    })
  );

  const completed = agentStatuses.filter(s => s.status === 'completed').length;

  return {
    batchName,
    progress: {
      completed,
      total: 34,
      percentage: Math.round((completed / 34) * 100)
    },
    agents: agentStatuses
  };
}
```

Dashboard UI shows:
```
Phase 5 - Batch 2 Progress
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 18/34 (53%)

✅ Agent 01 ✅ Agent 02 ✅ Agent 03 ⏳ Agent 04 ⏳ Agent 05
...
```

---

## Cost Comparison

### Claude CLI Approach (Current Test)
- Uses Anthropic API (charged separately)
- **Cost per agent**: ~$0.01
- **Cost for 34 agents**: ~$0.34
- **Cost for full Phase 5** (200 seeds ÷ 34 agents ≈ 6 runs): ~$2.00
- Plus monthly $200 Pro subscription = **$202/month**

### Claude Code on the Web Approach (Recommended)
- Uses Claude Pro subscription (already paying $200/month)
- **Cost per agent**: $0 (included in Pro)
- **Cost for 34 agents**: $0
- **Cost for full Phase 5**: $0
- **Total**: **$200/month** (no additional charges)

**Savings**: $2/batch, unlimited batches

---

## Implementation Timeline

### Today (15 minutes)
1. Create `dashboard/api/phase5/prepare-batch.js` endpoint
2. Create `dashboard/api/phase5/monitor-progress.js` endpoint
3. Add "Generate Phase 5" button in dashboard UI

### When You're Ready to Run (30 minutes)
1. Click "Generate Phase 5" in dashboard
2. Dashboard commits scaffolds + master prompt to GitHub
3. Open GitHub, view `MASTER_PROMPT.md`
4. Open 34 Claude Code on the Web tabs
5. Copy-paste prompts, hit Run in each tab
6. Claude sessions commit outputs
7. Dashboard shows real-time progress

---

## Alternative: Browser Automation (If You Want Full Automation)

**Warning**: This violates Anthropic's ToS and is fragile. Not recommended.

```javascript
// puppeteer-automation.js (USE AT YOUR OWN RISK)
const puppeteer = require('puppeteer');

async function automateClaudeCodeWeb() {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: '/Users/tomcassidy/Library/Application Support/Google/Chrome/Profile 1' // Use your logged-in profile
  });

  const agentPrompts = await loadAgentPrompts();

  // Launch 34 parallel agents
  const pages = await Promise.all(
    agentPrompts.map(async (prompt, i) => {
      const page = await browser.newPage();
      await page.goto('https://claude.ai/code');

      // Wait for page load (fragile - depends on claude.ai DOM structure)
      await page.waitForSelector('[data-testid="prompt-input"]', { timeout: 30000 });

      // Paste prompt
      await page.type('[data-testid="prompt-input"]', prompt);

      // Click run
      await page.click('[data-testid="run-button"]');

      // Wait for completion
      await page.waitForSelector('[data-testid="output-complete"]', { timeout: 600000 });

      return page;
    })
  );

  console.log('All 34 agents completed!');
}
```

**Drawbacks**:
- ⚠️ Likely violates Anthropic ToS
- ⚠️ Breaks every time Claude.ai updates their UI
- ⚠️ Requires reverse-engineering DOM selectors
- ⚠️ May get account banned

---

## 🎯 Final Recommendation

**Use the Hybrid Manual/Automated Approach:**

1. ✅ **Dashboard automates** scaffold generation + GitHub commits
2. ✅ **You manually run** 34 Claude Code on the Web sessions (20-30 min)
3. ✅ **Dashboard monitors** completion in real-time
4. ✅ **$0 additional cost** (uses Pro subscription)
5. ✅ **Compliant** with Anthropic ToS
6. ✅ **Reliable** (no DOM scraping fragility)

This leverages your existing $200/month Pro subscription fully, runs 34 agents in parallel on Anthropic's servers, and takes only 20-30 minutes of your time per batch.

Want me to implement the dashboard endpoints now?
