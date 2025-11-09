# Claude Code on the Web - GitHub Actions Integration Strategy

**Date**: 2025-11-08
**Purpose**: Leverage $200/month Claude Pro subscription for parallel Phase 5 basket generation
**Goal**: 34 parallel agents without consuming local Mac RAM

---

## 🎯 The Opportunity

You're paying $200/month for Claude Pro, which includes:
- ✅ **Unlimited Claude Code sessions**
- ✅ **Claude Code on the Web** (browser-based)
- ✅ **GitHub Actions integration** (@claude mentions)
- ✅ **No API costs** (already covered by subscription)

**Problem**: 34 parallel Phase 5 agents would consume 7-17 GB RAM locally
**Solution**: Use **GitHub Actions + Claude Code** to run agents in the cloud using your Pro subscription

---

## 🏗️ Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Dashboard (Vercel)                                          │
│     User clicks "Generate Phase 5"                              │
└────────────────────────┬────────────────────────────────────────┘
                         │ API call
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. Backend/Dashboard API                                       │
│     Creates GitHub commits/issues to trigger workflows          │
└────────────────────────┬────────────────────────────────────────┘
                         │ GitHub API
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. GitHub Repository                                           │
│     - Receives commit or issue creation                         │
│     - Triggers 34 parallel workflow runs                        │
└────────────────────────┬────────────────────────────────────────┘
                         │ Workflow dispatch
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  4. GitHub Actions (34 parallel jobs)                           │
│     - Each job invokes @claude via claude-code-action          │
│     - Uses your Claude Pro subscription (no API costs)          │
│     - Runs on GitHub's infrastructure (0 local RAM)             │
└────────────────────────┬────────────────────────────────────────┘
                         │ @claude mention
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  5. Claude Code (cloud-based)                                   │
│     - Processes agent prompt                                    │
│     - Generates basket phrases                                  │
│     - Commits results back to GitHub                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ Commit
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  6. GitHub Repository                                           │
│     - phase5_batch2_s0301_s0500/batch_output/                   │
│     - agent_01_baskets.json, agent_02_baskets.json, etc.        │
└────────────────────────┬────────────────────────────────────────┘
                         │ Webhook/polling
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│  7. Dashboard                                                   │
│     Shows progress, pulls completed baskets                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Option A: Issue-Based Trigger (Recommended) ⭐⭐⭐⭐⭐

**Concept**: Create 34 GitHub issues (one per agent), each with @claude mention and agent prompt

### Workflow:

#### 1. Dashboard triggers via GitHub API:

```javascript
// dashboard/api/trigger-phase5-parallel.js

import { Octokit } from '@octokit/rest';

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export async function triggerPhase5Parallel(courseCode, agentCount = 34) {
  const repo = {
    owner: 'your-username',
    repo: 'ssi-dashboard-v7'
  };

  // Create 34 issues in parallel (one per agent)
  const issuePromises = [];

  for (let agentId = 1; agentId <= agentCount; agentId++) {
    const agentPrompt = buildAgentPrompt(agentId); // Load scaffold + v4.1 prompt

    const issuePromise = octokit.issues.create({
      ...repo,
      title: `Phase 5 Agent ${agentId}: Generate Baskets`,
      body: `@claude ${agentPrompt}`,
      labels: ['phase-5', 'agent-generation', `agent-${agentId}`]
    });

    issuePromises.push(issuePromise);
  }

  // Create all 34 issues simultaneously
  const issues = await Promise.all(issuePromises);

  return {
    success: true,
    agentCount,
    issueUrls: issues.map(i => i.data.html_url),
    trackingUrl: `https://github.com/${repo.owner}/${repo.repo}/issues`
  };
}

function buildAgentPrompt(agentId) {
  // Load scaffold for this agent
  const scaffold = loadScaffold(`agent_${String(agentId).padStart(2, '0')}_scaffold.json`);

  // Build prompt using v4.1 staged pipeline approach
  return `
# Phase 5 Basket Generation - Agent ${agentId}

## Your Task
Fill in the practice_phrases arrays in the scaffold below.

## Instructions
${AGENT_PROMPT_V4_1_CONTENT}

## Scaffold
\`\`\`json
${JSON.stringify(scaffold, null, 2)}
\`\`\`

## Output
Reply with the completed scaffold JSON (practice_phrases filled in).

I will commit this to: phase5_batch2_s0301_s0500/batch_output/agent_${String(agentId).padStart(2, '0')}_baskets.json
`;
}
```

#### 2. GitHub Actions workflow listens for issues:

```yaml
# .github/workflows/phase5-agent.yml

name: Phase 5 Agent Generation

on:
  issues:
    types: [opened]

jobs:
  generate-basket:
    # Only run if issue has 'phase-5' label
    if: contains(github.event.issue.labels.*.name, 'phase-5')
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Agent ID
        id: agent-id
        run: |
          # Extract agent ID from issue labels
          AGENT_ID=$(echo "${{ github.event.issue.labels }}" | jq -r '.[] | select(.name | startswith("agent-")) | .name' | sed 's/agent-//')
          echo "agent_id=$AGENT_ID" >> $GITHUB_OUTPUT

      - name: Run Claude Code Action
        uses: anthropics/claude-code-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Claude will read the issue body which contains @claude mention + prompt
          # and respond with completed scaffold

      - name: Extract and Save Output
        run: |
          # Claude's response will be in issue comments
          # Extract JSON from latest comment by @claude
          AGENT_ID="${{ steps.agent-id.outputs.agent_id }}"
          OUTPUT_FILE="phase5_batch2_s0301_s0500/batch_output/agent_${AGENT_ID}_baskets.json"

          # Get latest comment from Claude
          gh api repos/${{ github.repository }}/issues/${{ github.event.issue.number }}/comments \
            --jq '.[-1].body' > temp_response.txt

          # Extract JSON (between ```json and ```)
          sed -n '/```json/,/```/p' temp_response.txt | sed '1d;$d' > "$OUTPUT_FILE"

          # Commit result
          git config user.name "SSi Bot"
          git config user.email "bot@ssi.com"
          git add "$OUTPUT_FILE"
          git commit -m "Agent ${AGENT_ID}: Complete Phase 5 basket generation"
          git push

      - name: Close Issue
        run: |
          gh issue close ${{ github.event.issue.number }} \
            --comment "✅ Agent ${{ steps.agent-id.outputs.agent_id }} completed successfully. Output saved to repository."
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Validate Output
        run: |
          AGENT_ID="${{ steps.agent-id.outputs.agent_id }}"
          node scripts/validate_agent_baskets.cjs \
            phase5_batch2_s0301_s0500/batch_output/agent_${AGENT_ID}_baskets.json \
            phase5_batch2_s0301_s0500/validation/agent_${AGENT_ID}_validation_report.json
```

#### 3. Dashboard monitors progress:

```javascript
// dashboard/api/monitor-phase5-progress.js

export async function monitorPhase5Progress(courseCode) {
  const repo = { owner: 'your-username', repo: 'ssi-dashboard-v7' };

  // Get all phase-5 issues
  const issues = await octokit.issues.listForRepo({
    ...repo,
    labels: 'phase-5',
    state: 'all'
  });

  const total = issues.data.length;
  const completed = issues.data.filter(i => i.state === 'closed').length;
  const inProgress = issues.data.filter(i => i.state === 'open').length;

  return {
    total,
    completed,
    inProgress,
    percentComplete: (completed / total) * 100,
    issues: issues.data.map(i => ({
      agentId: i.labels.find(l => l.name.startsWith('agent-'))?.name.replace('agent-', ''),
      status: i.state,
      url: i.html_url,
      createdAt: i.created_at,
      closedAt: i.closed_at
    }))
  };
}
```

**Benefits**:
- ✅ **Uses Claude Pro subscription** (no API costs)
- ✅ **34 parallel agents** (GitHub Actions free tier: 20 concurrent jobs, Pro: 60 concurrent)
- ✅ **0 local RAM** (runs on GitHub's infrastructure)
- ✅ **Easy monitoring** (GitHub Issues UI shows all agents)
- ✅ **Automatic retry** (can re-open issue if agent fails)
- ✅ **Version controlled** (all results committed to repo)

**Drawbacks**:
- ⚠️ GitHub Actions free tier: 2000 minutes/month (likely enough for testing)
- ⚠️ Need GitHub Pro for 60 concurrent jobs (or use 20 in batches)
- ⚠️ Slightly slower than API (issue creation + workflow queue)

---

## 📋 Option B: Workflow Dispatch Trigger ⭐⭐⭐⭐

**Concept**: Use workflow_dispatch to manually trigger 34 parallel workflows

### Workflow:

#### 1. Dashboard triggers via GitHub API:

```javascript
export async function triggerPhase5ViaWorkflow(courseCode) {
  const repo = { owner: 'your-username', repo: 'ssi-dashboard-v7' };

  // Trigger 34 parallel workflow runs
  const promises = [];

  for (let agentId = 1; agentId <= 34; agentId++) {
    const scaffold = loadScaffold(`agent_${String(agentId).padStart(2, '0')}_scaffold.json`);

    const promise = octokit.actions.createWorkflowDispatch({
      ...repo,
      workflow_id: 'phase5-agent.yml',
      ref: 'main',
      inputs: {
        agent_id: String(agentId),
        scaffold_json: JSON.stringify(scaffold)
      }
    });

    promises.push(promise);
  }

  await Promise.all(promises);

  return {
    success: true,
    agentCount: 34,
    workflowUrl: `https://github.com/${repo.owner}/${repo.repo}/actions`
  };
}
```

#### 2. GitHub Actions workflow:

```yaml
# .github/workflows/phase5-agent.yml

name: Phase 5 Agent Generation

on:
  workflow_dispatch:
    inputs:
      agent_id:
        description: 'Agent ID (1-34)'
        required: true
      scaffold_json:
        description: 'Scaffold JSON for this agent'
        required: true

jobs:
  generate-basket:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v3

      - name: Save scaffold to temp file
        run: |
          echo '${{ github.event.inputs.scaffold_json }}' > temp_scaffold.json

      - name: Create issue for Claude
        id: create-issue
        run: |
          AGENT_ID="${{ github.event.inputs.agent_id }}"

          ISSUE_BODY="@claude $(cat <<'EOF'
# Phase 5 Basket Generation - Agent ${AGENT_ID}

## Instructions
$(cat docs/phase_intelligence/AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md)

## Scaffold
\`\`\`json
$(cat temp_scaffold.json)
\`\`\`

## Output
Reply with the completed scaffold JSON (practice_phrases filled in).
EOF
)"

          ISSUE_NUM=$(gh issue create \
            --title "Phase 5 Agent ${AGENT_ID}" \
            --body "$ISSUE_BODY" \
            --label "phase-5,agent-${AGENT_ID}" \
            --json number -q .number)

          echo "issue_number=$ISSUE_NUM" >> $GITHUB_OUTPUT
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Wait for Claude response
        run: |
          # Poll for Claude's comment (max 30 minutes)
          for i in {1..360}; do
            COMMENTS=$(gh api repos/${{ github.repository }}/issues/${{ steps.create-issue.outputs.issue_number }}/comments)
            CLAUDE_COMMENT=$(echo "$COMMENTS" | jq -r '.[] | select(.user.login == "claude-code[bot]") | .body' | tail -1)

            if [ -n "$CLAUDE_COMMENT" ]; then
              echo "$CLAUDE_COMMENT" > claude_response.txt
              break
            fi

            sleep 5
          done

      - name: Extract and save basket
        run: |
          AGENT_ID="${{ github.event.inputs.agent_id }}"
          OUTPUT_FILE="phase5_batch2_s0301_s0500/batch_output/agent_${AGENT_ID}_baskets.json"

          # Extract JSON from Claude's response
          sed -n '/```json/,/```/p' claude_response.txt | sed '1d;$d' > "$OUTPUT_FILE"

          # Commit
          git config user.name "SSi Bot"
          git config user.email "bot@ssi.com"
          git add "$OUTPUT_FILE"
          git commit -m "Agent ${AGENT_ID}: Complete Phase 5 basket generation"
          git push

      - name: Validate
        run: |
          AGENT_ID="${{ github.event.inputs.agent_id }}"
          node scripts/validate_agent_baskets.cjs \
            phase5_batch2_s0301_s0500/batch_output/agent_${AGENT_ID}_baskets.json \
            phase5_batch2_s0301_s0500/validation/agent_${AGENT_ID}_validation_report.json

          # Add validation result as comment
          gh issue comment ${{ steps.create-issue.outputs.issue_number }} \
            --body "$(cat phase5_batch2_s0301_s0500/validation/agent_${AGENT_ID}_validation_report.json)"

      - name: Close issue
        run: |
          gh issue close ${{ steps.create-issue.outputs.issue_number }}
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**Benefits**:
- ✅ More control over inputs
- ✅ Cleaner than creating 34 issues
- ✅ Still uses Claude Pro subscription

**Drawbacks**:
- ⚠️ Still requires issue creation internally (for @claude mention)
- ⚠️ More complex workflow

---

## 📋 Option C: Commit-Based Trigger ⭐⭐⭐

**Concept**: Dashboard commits 34 scaffold files, each triggers a workflow that mentions @claude

### Workflow:

#### 1. Dashboard commits scaffolds:

```javascript
export async function triggerPhase5ViaCommits(courseCode) {
  const repo = { owner: 'your-username', repo: 'ssi-dashboard-v7' };

  // Prepare all 34 scaffolds
  const commits = [];

  for (let agentId = 1; agentId <= 34; agentId++) {
    const scaffold = generateScaffold(agentId);
    const filePath = `phase5_batch2_s0301_s0500/scaffolds/agent_${String(agentId).padStart(2, '0')}_scaffold.json`;

    commits.push({
      path: filePath,
      content: JSON.stringify(scaffold, null, 2)
    });
  }

  // Create single commit with all 34 scaffolds
  await octokit.repos.createOrUpdateFileContents({
    ...repo,
    message: 'Phase 5: Add scaffolds for 34 agents',
    content: Buffer.from(JSON.stringify(commits)).toString('base64'),
    branch: 'phase5-generation'
  });

  // Trigger workflow on this branch
  await octokit.actions.createWorkflowDispatch({
    ...repo,
    workflow_id: 'phase5-parallel.yml',
    ref: 'phase5-generation'
  });
}
```

#### 2. GitHub Actions detects new scaffolds:

```yaml
# .github/workflows/phase5-parallel.yml

name: Phase 5 Parallel Generation

on:
  workflow_dispatch:
  push:
    paths:
      - 'phase5_batch2_s0301_s0500/scaffolds/agent_*_scaffold.json'

jobs:
  detect-agents:
    runs-on: ubuntu-latest
    outputs:
      agent_ids: ${{ steps.find-scaffolds.outputs.agent_ids }}

    steps:
      - uses: actions/checkout@v3

      - name: Find scaffolds
        id: find-scaffolds
        run: |
          AGENT_IDS=$(ls phase5_batch2_s0301_s0500/scaffolds/agent_*_scaffold.json | \
            sed 's/.*agent_0*\([0-9]\+\)_scaffold.json/\1/' | jq -R -s -c 'split("\n") | map(select(length > 0))')
          echo "agent_ids=$AGENT_IDS" >> $GITHUB_OUTPUT

  generate-baskets:
    needs: detect-agents
    runs-on: ubuntu-latest
    timeout-minutes: 60

    strategy:
      matrix:
        agent_id: ${{ fromJson(needs.detect-agents.outputs.agent_ids) }}
      max-parallel: 34 # All 34 in parallel

    steps:
      - uses: actions/checkout@v3

      - name: Create Claude prompt issue
        id: create-issue
        run: |
          AGENT_ID="${{ matrix.agent_id }}"
          SCAFFOLD=$(cat phase5_batch2_s0301_s0500/scaffolds/agent_${AGENT_ID}_scaffold.json)

          # ... (same as Option B)
```

**Benefits**:
- ✅ Git-native (scaffolds versioned)
- ✅ Matrix strategy for parallelization

**Drawbacks**:
- ⚠️ More commits to repo
- ⚠️ Still needs issue creation for @claude

---

## 🎯 Recommended Approach: **Option A (Issue-Based)** ⭐

**Why**:
1. **Simplest integration** - Dashboard creates issues via GitHub API
2. **Best monitoring** - GitHub Issues UI shows progress for all 34 agents
3. **Easy debugging** - Each agent has its own issue thread
4. **Automatic cleanup** - Issues close when agents complete
5. **No workflow complexity** - Single workflow handles all agents

### Implementation Steps:

#### Step 1: Set up Claude Code GitHub App (5 minutes)

```bash
# In your local Claude Code CLI:
claude
/install-github-app

# Follow prompts to:
# - Authorize GitHub app
# - Grant repo access
# - Save credentials
```

#### Step 2: Create GitHub workflow (10 minutes)

Save the workflow file from Option A to `.github/workflows/phase5-agent.yml`

#### Step 3: Add dashboard trigger function (30 minutes)

```javascript
// dashboard/app/api/phase5/generate/route.ts

export async function POST(req: Request) {
  const { courseCode, agentCount = 34 } = await req.json();

  try {
    const result = await triggerPhase5Parallel(courseCode, agentCount);

    return Response.json({
      success: true,
      message: `Started ${agentCount} parallel agents`,
      issueUrls: result.issueUrls,
      trackingUrl: result.trackingUrl
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

#### Step 4: Add progress monitoring (20 minutes)

```javascript
// dashboard/app/api/phase5/status/route.ts

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const courseCode = searchParams.get('courseCode');

  const progress = await monitorPhase5Progress(courseCode);

  return Response.json(progress);
}
```

#### Step 5: Update dashboard UI (30 minutes)

```tsx
// dashboard/components/Phase5Monitor.tsx

export function Phase5Monitor({ courseCode }: { courseCode: string }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/phase5/status?courseCode=${courseCode}`);
      const data = await res.json();
      setProgress(data);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [courseCode]);

  if (!progress) return <div>Loading...</div>;

  return (
    <div>
      <h2>Phase 5 Generation Progress</h2>
      <div>
        <progress value={progress.completed} max={progress.total} />
        <span>{progress.completed}/{progress.total} agents ({progress.percentComplete}%)</span>
      </div>

      <div>
        {progress.issues.map(issue => (
          <div key={issue.agentId}>
            Agent {issue.agentId}: {issue.status}
            <a href={issue.url} target="_blank">View</a>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Total implementation time**: ~2 hours

---

## 💰 Cost Analysis

### Current System (Local Mac):
- **RAM**: 7-17 GB for 34 agents
- **Time**: High risk of crashes/slowdowns
- **Cost**: Hardware wear

### Claude Code Web (Recommended):
- **Cost**: $0 (included in $200/month Claude Pro)
- **RAM**: 0 GB local (runs on GitHub + Claude's infrastructure)
- **GitHub Actions**: Free tier (2000 min/month) or $4/month (3000 min/month)
- **Total additional cost**: $0-4/month

**Conclusion**: Use your existing Claude Pro subscription + GitHub's free CI/CD infrastructure instead of buying more RAM or paying API costs.

---

## 📊 Comparison: Local vs GitHub Actions

| Aspect | Local (osascript) | GitHub Actions + Claude Code Web |
|--------|-------------------|----------------------------------|
| **RAM Usage** | 7-17 GB | 0 GB |
| **Parallelization** | Limited by RAM | 20-60 concurrent jobs |
| **Cost** | Hardware wear | $0 (Claude Pro) + $0-4 (GitHub) |
| **Monitoring** | 34 iTerm windows | GitHub Issues UI |
| **Reliability** | Can crash | GitHub's infrastructure |
| **Setup** | Already working | ~2 hours |
| **Pro Subscription** | Not utilized | ✅ Fully utilized |

---

## 🚀 Next Steps

1. **Test with single agent** (30 min):
   - Manually create one issue with @claude mention
   - Verify Claude responds
   - Check output commits to repo

2. **Test with 3 agents** (30 min):
   - Create 3 issues programmatically
   - Verify parallel execution
   - Check GitHub Actions concurrent limits

3. **Full deployment** (34 agents):
   - Integrate with dashboard
   - Monitor progress
   - Validate outputs

4. **Extend to other phases**:
   - Phase 3 (LEGO extraction): 50+ parallel agents
   - Phase 1 (translation): 50+ parallel agents
   - All using your Claude Pro subscription

---

## 🎉 Summary

**You can absolutely trigger Claude Code on the Web via GitHub!**

The best approach is:
1. **Dashboard creates GitHub issues** (one per agent)
2. **Each issue mentions @claude** with the agent prompt
3. **Claude Code GitHub Action** responds to the mention
4. **Claude generates baskets** using your Pro subscription
5. **Results commit back** to the repo
6. **Dashboard monitors** progress via GitHub Issues API

**Benefits**:
- ✅ Uses your $200/month Claude Pro (no API costs)
- ✅ 34 parallel agents (0 local RAM)
- ✅ GitHub's infrastructure (reliable)
- ✅ Easy monitoring (Issues UI)
- ✅ ~2 hours to implement

Ready to implement this? I can start with the GitHub workflow file and dashboard trigger function.
