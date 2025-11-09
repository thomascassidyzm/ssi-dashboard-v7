# Simple GitHub Trigger Strategy - Automate Your Manual Process

**Current Manual Process**:
1. You open Claude Code on the Web in your browser
2. You paste in the agent prompt (e.g., "Generate Phase 5 baskets for Agent 01")
3. Claude generates the baskets
4. You copy the output and save it to a file

**What We Can Automate**:
- Dashboard creates GitHub issues/PRs with the prompt
- Claude Code on the Web automatically responds (you're already logged in)
- Output automatically saves to repo
- You monitor progress instead of manually copy-pasting

---

## 🎯 Simplest Approach: Repository Dispatch + Manual Claude Sessions

Since you're already comfortable with Claude Code on the Web, here's the **easiest integration**:

### Option 1: "Smart Bookmark" Approach (15 minutes setup) ⭐⭐⭐⭐⭐

**Concept**: Dashboard generates 34 prompt files in the repo. You open them in Claude Code on the Web (via bookmark or script).

#### How it works:

```
1. Dashboard commits 34 prompt files to repo:
   - prompts/phase5/agent_01_prompt.md
   - prompts/phase5/agent_02_prompt.md
   - ...
   - prompts/phase5/agent_34_prompt.md

2. Dashboard generates a "launcher page":
   - HTML page with 34 buttons
   - Each button opens Claude Code on the Web with that prompt pre-loaded
   - Opens in new tabs (you can open all 34 at once!)

3. You click "Launch All 34 Agents" button
   - 34 Claude Code tabs open
   - Each has the prompt already loaded
   - You hit "Run" in each tab (or use keyboard shortcut)

4. As each agent completes:
   - Claude Code's "Commit" feature saves output
   - Dashboard monitors commits to track progress
```

#### Implementation:

**Step 1: Dashboard creates prompts**

```javascript
// dashboard/api/phase5/prepare-agents.js

export async function prepareAgents(courseCode, agentCount = 34) {
  const prompts = [];

  for (let i = 1; i <= agentCount; i++) {
    const scaffold = loadScaffold(i);
    const prompt = buildAgentPrompt(i, scaffold);

    // Commit prompt to repo
    prompts.push({
      path: `prompts/phase5/agent_${String(i).padStart(2, '0')}_prompt.md`,
      content: prompt
    });
  }

  // Commit all prompts in one batch
  await commitToGitHub(prompts, 'Phase 5: Prepare agent prompts');

  // Generate launcher page
  const launcherHTML = generateLauncherPage(agentCount);

  return {
    success: true,
    launcherUrl: `/launch-agents.html`,
    promptsCommitted: agentCount
  };
}

function generateLauncherPage(agentCount) {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Launch Phase 5 Agents</title>
  <style>
    body { font-family: sans-serif; padding: 20px; }
    .agent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    button { padding: 10px; background: #10b981; color: white; border: none; border-radius: 4px; cursor: pointer; }
    button:hover { background: #059669; }
    .launch-all { margin: 20px 0; padding: 15px 30px; background: #3b82f6; font-size: 18px; }
  </style>
</head>
<body>
  <h1>Phase 5: Launch 34 Parallel Agents</h1>
  <p>Click "Launch All" to open all 34 Claude Code sessions at once, or launch individually.</p>

  <button class="launch-all" onclick="launchAll()">🚀 Launch All 34 Agents</button>

  <div class="agent-grid">
    ${Array.from({ length: agentCount }, (_, i) => {
      const agentId = i + 1;
      const agentNum = String(agentId).padStart(2, '0');
      return `<button onclick="launchAgent(${agentId})">Agent ${agentNum}</button>`;
    }).join('\n    ')}
  </div>

  <script>
    function launchAgent(agentId) {
      const agentNum = String(agentId).padStart(2, '0');
      const promptUrl = 'https://github.com/your-username/ssi-dashboard-v7/blob/main/prompts/phase5/agent_' + agentNum + '_prompt.md';

      // Open Claude Code on the Web with this prompt
      // Claude Code on the Web can open GitHub files directly
      const claudeUrl = 'https://claude.ai/code?github=' + encodeURIComponent(promptUrl);

      window.open(claudeUrl, '_blank_agent_' + agentId);
    }

    function launchAll() {
      for (let i = 1; i <= ${agentCount}; i++) {
        launchAgent(i);
        // Small delay to prevent browser blocking
        setTimeout(() => {}, 100 * i);
      }
    }
  </script>
</body>
</html>`;
}
```

**Step 2: You launch all agents**

1. Dashboard shows "Launch Agents" button
2. Click it → Opens launcher page
3. Click "Launch All 34 Agents"
4. 34 Claude Code tabs open (each with pre-loaded prompt)
5. You cycle through tabs hitting Enter/Run (or create keyboard macro)

**Step 3: Monitor completion**

```javascript
// Dashboard polls repo for completed outputs
export async function monitorAgentCompletion() {
  const outputs = [];

  for (let i = 1; i <= 34; i++) {
    const agentNum = String(i).padStart(2, '0');
    const outputPath = `phase5_batch2_s0301_s0500/batch_output/agent_${agentNum}_baskets.json`;

    // Check if file exists in repo
    const exists = await checkFileExists(outputPath);

    outputs.push({
      agentId: i,
      status: exists ? 'completed' : 'pending',
      outputPath
    });
  }

  return {
    completed: outputs.filter(o => o.status === 'completed').length,
    total: 34,
    percentComplete: (outputs.filter(o => o.status === 'completed').length / 34) * 100,
    outputs
  };
}
```

**Benefits**:
- ✅ **15 minutes to set up**
- ✅ **Uses your Claude Pro** (already logged in)
- ✅ **Simple** - just clicking buttons
- ✅ **Visual monitoring** - see all 34 tabs
- ✅ **No new auth** - you're already logged into Claude Code Web

**Drawbacks**:
- ⚠️ Still semi-manual (need to hit Run in each tab)
- ⚠️ 34 browser tabs open at once (but better than 34 iTerm windows!)

---

## Option 2: GitHub Issues + Your Manual Workflow (No code changes) ⭐⭐⭐⭐

**Concept**: Dashboard creates 34 GitHub issues. You manually paste them into Claude Code on the Web.

#### Workflow:

1. **Dashboard creates issues**:
```javascript
// One API call creates all 34 issues
const issues = await Promise.all(
  Array.from({ length: 34 }, (_, i) => {
    const agentId = i + 1;
    const prompt = buildAgentPrompt(agentId);

    return octokit.issues.create({
      owner: 'your-username',
      repo: 'ssi-dashboard-v7',
      title: `Phase 5: Agent ${String(agentId).padStart(2, '0')}`,
      body: prompt,
      labels: ['phase-5', `agent-${agentId}`]
    });
  })
);
```

2. **You open each issue and copy-paste into Claude Code on the Web**:
   - GitHub shows 34 issues
   - You open issue #1
   - Copy the prompt
   - Paste into Claude Code on the Web
   - Claude generates output
   - You commit via Claude Code's commit feature

3. **Dashboard tracks which issues are closed** (manual closure or auto-close on commit)

**Benefits**:
- ✅ **Zero code** - just using GitHub Issues
- ✅ **Familiar workflow** - exactly what you do now
- ✅ **Easy tracking** - GitHub Issues UI

**Drawbacks**:
- ⚠️ Most manual option
- ⚠️ 34 copy-pastes

---

## Option 3: Browser Automation (Selenium/Puppeteer) ⭐⭐⭐

**Concept**: Script controls your browser to automate the manual clicking

```javascript
// puppeteer-agent-launcher.js
const puppeteer = require('puppeteer');

async function launchAgents() {
  const browser = await puppeteer.launch({ headless: false });

  // Launch 34 agents in parallel
  const pages = await Promise.all(
    Array.from({ length: 34 }, async (_, i) => {
      const agentId = i + 1;
      const page = await browser.newPage();

      // Navigate to Claude Code on the Web
      await page.goto('https://claude.ai/code');

      // Wait for login (you're already logged in with cookies)
      await page.waitForSelector('.prompt-input');

      // Paste prompt
      const prompt = loadAgentPrompt(agentId);
      await page.type('.prompt-input', prompt);

      // Click "Run" button
      await page.click('button[data-testid="run-button"]');

      return page;
    })
  );

  // Monitor completion
  await Promise.all(pages.map(page =>
    page.waitForSelector('.output-complete', { timeout: 600000 }) // 10 min timeout
  ));

  console.log('All 34 agents completed!');
}
```

**Benefits**:
- ✅ Fully automated
- ✅ Uses your Claude Pro login

**Drawbacks**:
- ⚠️ Fragile (breaks if Claude UI changes)
- ⚠️ Might violate TOS (automated browser usage)

---

## 🎯 Recommended: **Hybrid Approach** ⭐⭐⭐⭐⭐

Combine the best of Option 1 and 2:

### What Dashboard Does:
1. Generates 34 scaffold files (already done with your staged pipeline)
2. Commits them to `phase5_batch2_s0301_s0500/scaffolds/`
3. Creates **one master GitHub issue** with links to all 34 scaffolds
4. Issue body contains:
   ```markdown
   # Phase 5: Generate 34 Agent Baskets

   ## Instructions
   For each agent below, open the scaffold link and paste it into Claude Code on the Web.

   ### Agent 01
   - Scaffold: [agent_01_scaffold.json](link)
   - Prompt: [Copy this](shows v4.1 prompt)
   - Output: Commit to `batch_output/agent_01_baskets.json`

   ### Agent 02
   - Scaffold: [agent_02_scaffold.json](link)
   - Prompt: [Copy this](shows v4.1 prompt)
   - Output: Commit to `batch_output/agent_02_baskets.json`

   ... (repeat for all 34)

   ## Progress Tracker
   - [ ] Agent 01
   - [ ] Agent 02
   ...
   - [ ] Agent 34
   ```

### What You Do:
1. Open the GitHub issue
2. Open 34 Claude Code on the Web tabs (can open in batches)
3. For each tab:
   - Copy scaffold from GitHub
   - Paste into Claude Code
   - Add v4.1 prompt
   - Hit Run
   - Use Claude's commit feature to save output
4. Check off agents in the GitHub issue as you complete them

### What Dashboard Monitors:
- Watches for commits to `batch_output/agent_*_baskets.json`
- Updates progress bar in real-time
- Shows which agents are done

**Benefits**:
- ✅ **Leverages what you already do** (manual Claude Code usage)
- ✅ **Organized** (one master issue tracks everything)
- ✅ **Automated monitoring** (dashboard shows progress)
- ✅ **Uses Claude Pro** (no API costs)
- ✅ **15-30 min setup**

---

## 🚀 Quickest Path Forward (30 minutes)

Let me create:

1. **GitHub issue template** (5 min)
   - Pre-formatted with all 34 agents
   - Checkboxes for progress
   - Links to scaffolds

2. **Dashboard API endpoint** (10 min)
   - `POST /api/phase5/create-master-issue`
   - Creates the issue via GitHub API
   - Returns issue URL

3. **Dashboard monitoring** (15 min)
   - Polls repo for completed `agent_*_baskets.json` files
   - Shows progress bar
   - Links to outputs

Then you:
1. Click "Generate Phase 5" in dashboard
2. Dashboard creates GitHub issue
3. You open issue
4. You open 34 Claude Code tabs (or batches of 5-10)
5. You run the prompts
6. Dashboard shows you which ones are done

**This is basically what you're doing now, but organized!**

Want me to create these three pieces?
