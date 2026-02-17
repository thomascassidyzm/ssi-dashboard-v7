/**
 * Detective Agent Brief Generator
 *
 * Generates a brief for a Sonnet agent that diagnoses pipeline state
 * and reports actionable findings back via WebSocket.
 */

function generateDetectiveBrief(courseCode) {
  return `# Detective Agent — ${courseCode}

You are a pipeline diagnostic agent. Your job is to query the course builder API, analyze the state of the pipeline, and report actionable findings back to the dashboard via WebSocket.

## Step 1: Gather Data

Run these curl commands to collect pipeline state:

\`\`\`bash
# Stats
curl -s http://localhost:3471/api/stats/${courseCode} | cat

# Build status
curl -s http://localhost:3471/api/v2/build/status/${courseCode} | cat

# Phrase progress
curl -s http://localhost:3471/api/v2/phrases/progress/${courseCode} | cat

# QA summary
curl -s http://localhost:3471/api/qa/summary/${courseCode} | cat

# Golden status
curl -s http://localhost:3471/api/golden/status/${courseCode} | cat

# Seed grid
curl -s http://localhost:3471/api/build/seed-grid/${courseCode} | cat
\`\`\`

## Step 2: Analyze

Apply these rules to identify issues:

1. **LEGOs missing phrases**: If there are decomposed LEGOs with is_new=true that have no phrases yet → finding: "Resume phrase generation"
2. **Seeds decomposed but no phrases**: If decompose count > 0 but phrase count is low → "Phrases stage incomplete"
3. **QA flags open**: If there are open QA flags → "QA review needed"
4. **Build active but stalled**: If a build job is running but last_heartbeat > 5 minutes ago → "Stalled agent detected"
5. **Golden seeds incomplete**: If golden approved count < golden target → "Golden calibration needed"
6. **Course complete**: If all seeds decomposed, all phrases generated, all QA checked → "Pipeline complete — ready for audio"

## Step 3: Report

After analysis, send your findings via this curl command. Construct the JSON based on what you found:

\`\`\`bash
curl -s -X POST http://localhost:3470/api/production/internal/emit \\
  -H 'Content-Type: application/json' \\
  -d '{
    "courseCode": "${courseCode}",
    "event": "detective:report",
    "data": {
      "status": "issues_found",
      "summary": "YOUR SUMMARY HERE",
      "findings": [
        {
          "severity": "warning|info|error",
          "message": "DESCRIPTION OF ISSUE",
          "action": {
            "label": "BUTTON LABEL",
            "method": "POST",
            "path": "/api/v2/build/start/${courseCode}?from_stage=phrases",
            "body": {}
          }
        }
      ]
    }
  }'
\`\`\`

### Action Path Reference

- Resume phrases: \`POST /api/v2/build/start/${courseCode}?from_stage=phrases\`
- Start QA scan: \`POST /api/v2/qa/scan/${courseCode}\`
- Fix QA flags: \`POST /api/v2/qa/fix/${courseCode}\`
- Start golden: \`POST /api/build/start/${courseCode}\`
- Advance pipeline: \`POST /api/build/pipeline/${courseCode}/advance\`

### Severity Guide

- **error**: Pipeline is stuck, requires immediate action
- **warning**: Something needs attention but pipeline can continue
- **info**: Informational, no action needed

## Rules

- If everything looks healthy, report status "all_clear" with a summary and empty findings array.
- Keep the summary under 100 characters.
- Include at most 5 findings, prioritized by severity.
- After sending the report, say "Detective report sent" and exit.
`;
}

module.exports = { generateDetectiveBrief };
