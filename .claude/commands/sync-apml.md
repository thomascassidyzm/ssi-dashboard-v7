# Sync APML with Codebase

**Quick command**: Scan recent changes and sync APML specification.

## What This Does

1. Checks recent git commits for code changes
2. Identifies which APML files need updating
3. Updates APML files to match current code
4. Commits the changes

## Usage

Just run `/sync-apml` and I'll:
- Review recent commits
- Detect changes that affect APML
- Update relevant APML files
- Show you what changed

## How It Works

### Step 1: Detect Changes
```bash
git log --oneline -10  # Recent commits
git diff HEAD~5 automation_server.cjs src/ docs/phase_intelligence/
```

### Step 2: Analyze Impact
For each change, determine:
- Which APML file(s) are affected?
- What needs to be updated?
- Are there cross-references to update?

### Step 3: Update APML
- Read source code
- Update APML files
- Verify consistency

### Step 4: Commit
```bash
git add apml/
git commit -m "Sync APML with codebase changes from [commits]"
```

---

**Use this command regularly** to keep APML synchronized!
