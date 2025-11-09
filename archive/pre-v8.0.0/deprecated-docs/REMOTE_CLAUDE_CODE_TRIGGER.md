# Remote Claude Code Trigger - Dashboard to Desktop Machine

**Setup**:
- ✅ GitHub CLI installed and authenticated
- ✅ Claude Code CLI v2.0.8 installed
- ✅ Claude Code on the Web session active
- ✅ Desktop machine stays online

**Goal**: Dashboard triggers 34 parallel Claude Code sessions on your desktop machine remotely

---

## 🎯 The Perfect Solution: GitHub Actions → Local Runner

Since you want your **desktop machine** to run the agents (using your Claude Pro subscription), we need a **GitHub Actions self-hosted runner** on your Mac.

### Architecture:

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard (Vercel)                                         │
│  User clicks "Generate Phase 5"                             │
└────────────────────┬────────────────────────────────────────┘
                     │ GitHub API (create workflow)
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  GitHub Repository                                          │
│  Receives workflow_dispatch event                           │
│  Triggers 34 parallel jobs                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ Job assignment
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Your Mac (Self-Hosted Runner)                              │
│  - Receives job from GitHub                                 │
│  - Runs: claude code --prompt "agent_prompt.md"            │
│  - Uses your Claude Pro session                             │
│  - Saves output to repo                                     │
│  - Can run 34 in parallel (using Claude Pro, not local AI)  │
└────────────────────┬────────────────────────────────────────┘
                     │ Commits output
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  GitHub Repository                                          │
│  - agent_01_baskets.json                                    │
│  - agent_02_baskets.json                                    │
│  - ... etc                                                  │
└────────────────────┬────────────────────────────────────────┘
                     │ Dashboard polls
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                                  │
│  Shows progress: 18/34 completed                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Implementation Steps

### Step 1: Set up GitHub Actions Self-Hosted Runner (10 minutes)

Your Mac will listen for GitHub Actions jobs and execute them locally.

```bash
# 1. Go to your GitHub repo settings
# https://github.com/thomascassidyzm/ssi-dashboard-v7/settings/actions/runners/new

# 2. GitHub will show you commands like:
mkdir actions-runner && cd actions-runner
curl -o actions-runner-osx-arm64-2.321.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.321.0/actions-runner-osx-arm64-2.321.0.tar.gz
tar xzf ./actions-runner-osx-arm64-2.321.0.tar.gz

# 3. Configure the runner
./config.sh --url https://github.com/thomascassidyzm/ssi-dashboard-v7 --token <YOUR_TOKEN>

# When prompted:
# - Runner name: "mac-claude-code-runner"
# - Labels: "self-hosted,macOS,claude-code"
# - Work folder: "_work" (default)

# 4. Install and start as a service (runs automatically on boot)
./svc.sh install
./svc.sh start

# Verify it's running:
./svc.sh status
```

Now your Mac is listening for GitHub Actions jobs!

---

### Step 2: Create GitHub Workflow for Parallel Agents (15 minutes)

```yaml
# .github/workflows/phase5-parallel-agents.yml

name: Phase 5 - Parallel Agent Generation

on:
  workflow_dispatch:
    inputs:
      course_code:
        description: 'Course code (e.g., spa_for_eng)'
        required: true
        default: 'spa_for_eng'
      agent_count:
        description: 'Number of parallel agents'
        required: true
        default: '34'

jobs:
  prepare-scaffolds:
    runs-on: ubuntu-latest
    outputs:
      agent_ids: ${{ steps.generate-ids.outputs.agent_ids }}

    steps:
      - uses: actions/checkout@v3

      - name: Generate agent IDs
        id: generate-ids
        run: |
          # Create array of agent IDs [1, 2, 3, ..., 34]
          AGENT_IDS=$(seq 1 ${{ github.event.inputs.agent_count }} | jq -R -s -c 'split("\n")[:-1]')
          echo "agent_ids=$AGENT_IDS" >> $GITHUB_OUTPUT

  generate-baskets:
    needs: prepare-scaffolds
    runs-on: [self-hosted, macOS, claude-code]  # Runs on YOUR Mac
    timeout-minutes: 60

    strategy:
      matrix:
        agent_id: ${{ fromJson(needs.prepare-scaffolds.outputs.agent_ids) }}
      max-parallel: 34  # All 34 agents in parallel
      fail-fast: false  # Continue even if one fails

    steps:
      - uses: actions/checkout@v3

      - name: Load scaffold
        id: load-scaffold
        run: |
          AGENT_NUM=$(printf "%02d" ${{ matrix.agent_id }})
          SCAFFOLD_PATH="phase5_batch2_s0301_s0500/scaffolds/agent_${AGENT_NUM}_scaffold.json"

          if [ ! -f "$SCAFFOLD_PATH" ]; then
            echo "❌ Scaffold not found: $SCAFFOLD_PATH"
            exit 1
          fi

          echo "scaffold_path=$SCAFFOLD_PATH" >> $GITHUB_OUTPUT
          echo "agent_num=$AGENT_NUM" >> $GITHUB_OUTPUT

      - name: Create agent prompt
        run: |
          AGENT_NUM="${{ steps.load-scaffold.outputs.agent_num }}"
          SCAFFOLD_PATH="${{ steps.load-scaffold.outputs.scaffold_path }}"

          # Build prompt (v4.1 staged pipeline approach)
          cat > /tmp/agent_${AGENT_NUM}_prompt.md <<'EOF'
# Phase 5 Basket Generation - Agent ${{ matrix.agent_id }}

You have been provided with a scaffold JSON where ALL mechanical setup is complete.

## Your ONLY Task: Generate Practice Phrases

Fill in the \`practice_phrases\` arrays for each LEGO in the scaffold below.

## Requirements:

### For EACH LEGO:
1. **Understand the LEGO**: What is it? (verb/noun/adjective/phrase)
2. **Generate 10 phrases**:
   - 2 short (1-2 words)
   - 2 quite short (3 words)
   - 2 longer (4-5 words)
   - 4 long (6+ words)
3. **GATE Compliance**: ONLY use words from the \`whitelist\` array
4. **Natural Language**: Would a native speaker say this?
5. **Progressive Complexity**: Build from simple to complex
6. **Special Rule**: If \`is_final_lego: true\`, phrase 10 MUST be complete seed sentence

## ❌ PROHIBITED:
- Write Python/JavaScript scripts to generate phrases
- Use template-based generation (f-strings)
- Mechanically substitute LEGO text into patterns

## ✅ REQUIRED:
- Think through each phrase individually
- Use extended thinking (\`<thinking>\` tags)
- Understand grammatical role
- Create natural usage

## Scaffold:

\`\`\`json
$(cat $SCAFFOLD_PATH)
\`\`\`

## Output Format:

Return the SAME scaffold JSON with \`practice_phrases\` filled in.
DO NOT modify any other fields.

EOF

      - name: Run Claude Code
        run: |
          AGENT_NUM="${{ steps.load-scaffold.outputs.agent_num }}"

          # Run Claude Code CLI with the prompt
          # This uses your Claude Pro subscription (logged in via browser)
          claude code \
            --prompt-file /tmp/agent_${AGENT_NUM}_prompt.md \
            --output-file phase5_batch2_s0301_s0500/batch_output/agent_${AGENT_NUM}_baskets.json \
            --auto-approve \
            --timeout 3600

      - name: Validate output
        run: |
          AGENT_NUM="${{ steps.load-scaffold.outputs.agent_num }}"
          OUTPUT_PATH="phase5_batch2_s0301_s0500/batch_output/agent_${AGENT_NUM}_baskets.json"

          # Run validation script
          node scripts/validate_agent_baskets.cjs \
            "$OUTPUT_PATH" \
            "phase5_batch2_s0301_s0500/validation/agent_${AGENT_NUM}_validation_report.json"

      - name: Commit results
        run: |
          AGENT_NUM="${{ steps.load-scaffold.outputs.agent_num }}"

          git config user.name "SSi Bot"
          git config user.email "bot@ssi.com"

          git add phase5_batch2_s0301_s0500/batch_output/agent_${AGENT_NUM}_baskets.json
          git add phase5_batch2_s0301_s0500/validation/agent_${AGENT_NUM}_validation_report.json

          git commit -m "Agent ${AGENT_NUM}: Complete Phase 5 basket generation"
          git push

      - name: Report completion
        if: always()
        run: |
          AGENT_NUM="${{ steps.load-scaffold.outputs.agent_num }}"

          if [ ${{ job.status }} == 'success' ]; then
            echo "✅ Agent ${AGENT_NUM} completed successfully"
          else
            echo "❌ Agent ${AGENT_NUM} failed"
          fi
```

---

### Step 3: Dashboard Trigger (10 minutes)

```javascript
// dashboard/app/api/phase5/trigger-parallel/route.ts

import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

export async function POST(req: Request) {
  const { courseCode, agentCount = 34 } = await req.json();

  try {
    // Trigger GitHub Actions workflow
    const response = await octokit.actions.createWorkflowDispatch({
      owner: 'thomascassidyzm',
      repo: 'ssi-dashboard-v7',
      workflow_id: 'phase5-parallel-agents.yml',
      ref: 'main',
      inputs: {
        course_code: courseCode,
        agent_count: String(agentCount)
      }
    });

    return Response.json({
      success: true,
      message: `Started ${agentCount} parallel agents on your Mac`,
      workflowUrl: `https://github.com/thomascassidyzm/ssi-dashboard-v7/actions`,
      status: 'Agents will start running on your desktop in ~10 seconds'
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
```

---

### Step 4: Dashboard Monitoring (10 minutes)

```javascript
// dashboard/app/api/phase5/status/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseCode = searchParams.get('courseCode');

  // Check which agents have completed by looking for output files
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const completedAgents = [];
  const failedAgents = [];

  for (let i = 1; i <= 34; i++) {
    const agentNum = String(i).padStart(2, '0');
    const outputPath = `phase5_batch2_s0301_s0500/batch_output/agent_${agentNum}_baskets.json`;

    try {
      // Check if file exists in repo
      await octokit.repos.getContent({
        owner: 'thomascassidyzm',
        repo: 'ssi-dashboard-v7',
        path: outputPath,
        ref: 'main'
      });

      completedAgents.push(i);
    } catch (error) {
      // File doesn't exist yet
      if (error.status === 404) {
        // Check validation report for failure
        try {
          await octokit.repos.getContent({
            owner: 'thomascassidyzm',
            repo: 'ssi-dashboard-v7',
            path: `phase5_batch2_s0301_s0500/validation/agent_${agentNum}_validation_report.json`,
            ref: 'main'
          });

          // Has validation but no output = failed
          failedAgents.push(i);
        } catch {
          // Neither exists = still running
        }
      }
    }
  }

  const total = 34;
  const completed = completedAgents.length;
  const failed = failedAgents.length;
  const inProgress = total - completed - failed;

  return Response.json({
    total,
    completed,
    failed,
    inProgress,
    percentComplete: (completed / total) * 100,
    completedAgents,
    failedAgents
  });
}
```

---

### Step 5: Dashboard UI (10 minutes)

```tsx
// dashboard/components/Phase5ParallelMonitor.tsx

'use client';

import { useEffect, useState } from 'react';

export function Phase5ParallelMonitor({ courseCode }: { courseCode: string }) {
  const [status, setStatus] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function startGeneration() {
    setIsGenerating(true);

    const response = await fetch('/api/phase5/trigger-parallel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseCode, agentCount: 34 })
    });

    const result = await response.json();

    if (result.success) {
      alert(`✅ Started 34 agents on your Mac!\n\n${result.status}`);
      startPolling();
    } else {
      alert(`❌ Error: ${result.error}`);
      setIsGenerating(false);
    }
  }

  function startPolling() {
    const interval = setInterval(async () => {
      const response = await fetch(`/api/phase5/status?courseCode=${courseCode}`);
      const data = await response.json();

      setStatus(data);

      // Stop polling when all done
      if (data.inProgress === 0) {
        clearInterval(interval);
        setIsGenerating(false);

        if (data.failed === 0) {
          alert(`🎉 All ${data.completed} agents completed successfully!`);
        } else {
          alert(`⚠️ Completed with ${data.failed} failures. Check logs.`);
        }
      }
    }, 5000); // Poll every 5 seconds
  }

  return (
    <div className="p-6 bg-slate-800 rounded-lg">
      <h2 className="text-2xl font-bold text-emerald-400 mb-4">
        Phase 5: Parallel Agent Generation
      </h2>

      {!isGenerating && !status && (
        <button
          onClick={startGeneration}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded transition"
        >
          🚀 Start 34 Parallel Agents on Your Mac
        </button>
      )}

      {isGenerating && status && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-lg text-slate-300">
              Progress: {status.completed}/{status.total} agents
            </span>
            <span className="text-emerald-400 font-semibold">
              {Math.round(status.percentComplete)}%
            </span>
          </div>

          <div className="w-full bg-slate-700 rounded-full h-4">
            <div
              className="bg-emerald-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${status.percentComplete}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-900 p-3 rounded">
              <div className="text-slate-400">Completed</div>
              <div className="text-2xl text-emerald-400">{status.completed}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded">
              <div className="text-slate-400">In Progress</div>
              <div className="text-2xl text-blue-400">{status.inProgress}</div>
            </div>
            <div className="bg-slate-900 p-3 rounded">
              <div className="text-slate-400">Failed</div>
              <div className="text-2xl text-red-400">{status.failed}</div>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Running on your Mac via GitHub Actions self-hosted runner
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 🎯 How It Works End-to-End:

1. **You leave your Mac online** with:
   - GitHub Actions self-hosted runner running
   - Claude Code CLI installed (already ✅)
   - Claude Pro session active in browser (already ✅)

2. **From anywhere** (your phone, another computer):
   - Open dashboard
   - Click "Generate Phase 5"
   - Dashboard triggers GitHub workflow

3. **Your Mac receives the job**:
   - GitHub Actions runner picks up 34 jobs
   - Each job runs: `claude code --prompt-file agent_XX_prompt.md`
   - Claude Code uses your Claude Pro subscription
   - Outputs commit back to GitHub

4. **Dashboard shows progress in real-time**:
   - Polls GitHub repo every 5 seconds
   - Shows 18/34 completed
   - Updates progress bar

5. **When done**:
   - All 34 baskets in repo
   - Dashboard shows ✅ Complete
   - You can review/validate

---

## 💰 Cost Analysis:

- **GitHub Actions self-hosted runner**: $0 (runs on your Mac)
- **Claude Pro subscription**: $200/month (already paying)
- **Additional API costs**: $0
- **Total**: $0 extra

---

## 🚀 Time to Implement:

- Step 1 (Self-hosted runner): 10 min
- Step 2 (Workflow file): 15 min
- Step 3 (Dashboard trigger): 10 min
- Step 4 (Monitoring): 10 min
- Step 5 (UI): 10 min

**Total: 55 minutes**

---

## ✅ Benefits:

- ✅ **Uses your Claude Pro** ($200/month already paying)
- ✅ **Runs on your Mac** (familiar environment)
- ✅ **34 parallel agents** (no RAM limit - Claude runs in cloud)
- ✅ **Trigger from anywhere** (dashboard/phone)
- ✅ **Zero additional costs**
- ✅ **Real-time monitoring**
- ✅ **Auto-commit results**

Want me to start implementing? I can:
1. Create the GitHub workflow file
2. Create the dashboard API endpoints
3. Create the monitoring UI

Then you just need to:
1. Set up the self-hosted runner (10 min, I'll guide you)
2. Test with 1 agent
3. Run all 34!
