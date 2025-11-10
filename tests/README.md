# E2E Test Suite for SSI Dashboard v8.0.0

## Overview

End-to-end integration tests that validate the complete course generation workflow from the user's perspective.

**What it tests**: User clicks "Create Course" in dashboard → Full pipeline executes → All outputs generated and validated

## Test Files

### `e2e-course-generation.test.js`

Complete workflow test covering:

1. **Course Generation Trigger** - POST /api/courses/generate
2. **Progress Monitoring** - Polling /api/courses/:code/status
3. **Phase 1 Validation** - seed_pairs.json structure and content
4. **Phase 3 Validation** - lego_pairs.json with LEGO extraction
5. **Phase 5 Validation** - lego_baskets.json with practice phrases
6. **Phase 6 Validation** - introductions.json
7. **Phase 7 Validation** - course_manifest.json
8. **Smart Resume** - Detects existing courses and prevents overwrite
9. **Execution Mode Defaults** - Web mode is default
10. **Course Code Generation** - Naming conventions (4-digit seed padding)
11. **Phase Intelligence Loading** - All 7 phase prompts loaded

## Prerequisites

### 1. Start Automation Server

```bash
npm run server
# or
pm2 start automation_server.cjs --name ssi-automation
```

Server must be running on `http://localhost:3456`

### 2. Configure API Key (for API mode tests)

Create `.env` file:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

Or set environment variable:

```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Note**: If using Web Mode for tests, browser automation will be used instead of API key.

## Running Tests

### Run All E2E Tests

```bash
npm test tests/e2e-course-generation.test.js
```

### Run with UI (Watch Mode)

```bash
npm run test:ui
```

Then open the Vitest UI in your browser to see real-time progress.

### Run Single Test

```bash
npm test -- --run -t "Complete course generation workflow"
```

## Test Configuration

### Execution Mode

Tests default to **API mode** for speed and automation:

```javascript
const TEST_COURSE = {
  target: 'spa',
  known: 'eng',
  startSeed: 1,
  endSeed: 3,
  executionMode: 'api' // Change to 'web' or 'local' if needed
}
```

**Modes**:
- `api` - Direct Anthropic API calls (fast, requires API key)
- `web` - Browser automation to claude.ai/code (slower, no API key needed)
- `local` - iTerm2 + Claude CLI (legacy, not recommended for tests)

### Test Course Size

Tests use **3 seeds** for speed:

```javascript
startSeed: 1,
endSeed: 3
```

Increase for more comprehensive testing, but note:
- 3 seeds: ~30-60 seconds (API mode)
- 30 seeds: ~5-10 minutes
- 100 seeds: ~20-30 minutes

### Timeout

Default test timeout: **5 minutes** (300,000ms)

Increase for larger courses:

```javascript
test('Complete workflow', async () => {
  // ...
}, 600000) // 10 minutes
```

## What Gets Tested

### File Structure Validation

✅ Course directory created: `public/vfs/courses/spa_for_eng_s0001-0003/`
✅ seed_pairs.json exists and has correct format
✅ lego_pairs.json exists with LEGO breakdowns
✅ lego_baskets.json exists with practice phrases
✅ introductions.json exists with LEGO introductions
✅ course_manifest.json exists with metadata

### Data Format Validation

✅ Version fields correct (7.7.0 for seed_pairs, 7.7 for lego_pairs)
✅ Seed IDs use 4-digit padding (S0001, not S1)
✅ LEGO IDs follow format (S0001L01)
✅ Translations are [target, known] tuples
✅ LEGOs have correct type (B for Base, C for Composite)
✅ Composite LEGOs include componentization
✅ Baskets have eternal (e) and derived (d) sections
✅ Introductions match LEGO count

### Workflow Validation

✅ Course generation starts successfully
✅ Progress polling works (status updates)
✅ All phases complete in sequence
✅ Final status is 'completed'
✅ No errors thrown during generation

### Edge Cases

✅ Duplicate course detection (409 Conflict)
✅ Smart Resume skips existing phases
✅ Execution mode defaults to 'web'
✅ Missing API key detected (API mode)

## Expected Output

```
=== E2E Test Setup ===
✓ Automation server is running
✓ ANTHROPIC_API_KEY configured

=== Starting E2E Course Generation Test ===
Course: spa_for_eng_s0001-0003
Mode: api
Seeds: 1-3

[Step 1] Triggering course generation...
✓ Course generation started

[Step 2] Monitoring progress...
  [Poll] Status: in_progress, Phase: phase_1_api, Progress: 0%
  [Poll] Status: in_progress, Phase: phase_1_api, Progress: 15%
  [Poll] Status: in_progress, Phase: phase_3_api, Progress: 35%
  [Poll] Status: in_progress, Phase: phase_5_api, Progress: 65%
  [Poll] Status: completed, Phase: phase_5_complete, Progress: 100%

✓ Course generation completed successfully!
  Final status: completed
  Final phase: phase_5_complete

[Step 3] Validating directory structure...
✓ Course directory exists

[Step 4] Validating Phase 1 output...
✓ Phase 1: seed_pairs.json valid
  - 3 seeds translated
  - Format: v7.7.0
  - Seed IDs: S0001, S0002, S0003

[Step 5] Validating Phase 3 output...
✓ Phase 3: lego_pairs.json valid
  - 3 seeds processed
  - 8 LEGOs extracted

[Step 6] Validating Phase 5 output...
✓ Phase 5: lego_baskets.json valid (consolidated)
  - 8 baskets generated

[Step 7] Validating Phase 6 output...
✓ Phase 6: introductions.json valid
  - 8 introductions generated

[Step 8] Validating Phase 7 output...
✓ Phase 7: course_manifest.json valid
  - Course: spa_for_eng_s0001-0003
  - Seeds: 3
  - LEGOs: 8

=== E2E Test Summary ===
✓ All phases completed successfully
✓ All output files validated
✓ Course generation workflow works end-to-end

Generated files:
  - seed_pairs.json (3 seeds)
  - lego_pairs.json (8 LEGOs)
  - lego_baskets.json (8 baskets)
  - introductions.json (8 intros)
  - course_manifest.json

 ✓ tests/e2e-course-generation.test.js (9)
   ✓ E2E Course Generation Workflow (3)
   ✓ Smart Resume Detection (1)
   ✓ VFS File Structure (1)
   ✓ Phase Intelligence Loading (1)

Test Files  1 passed (1)
     Tests  9 passed (9)
  Start at  12:00:00
  Duration  45.23s
```

## Troubleshooting

### Server Not Running

```
✗ Automation server not running! Start with: npm run server
```

**Fix**: Start the server first:

```bash
npm run server
# or
pm2 start automation_server.cjs --name ssi-automation
```

### API Key Not Configured

```
⚠️  ANTHROPIC_API_KEY not set - API mode will fail
   Set in .env file or switch test to web/local mode
```

**Fix**: Either:
1. Add to `.env`: `ANTHROPIC_API_KEY=sk-ant-api03-...`
2. Change test to use Web Mode: `executionMode: 'web'`

### Test Timeout

```
Error: Timeout waiting for completion
```

**Fix**: Increase timeout or reduce seed count:

```javascript
// Option 1: Smaller course
const TEST_COURSE = { ..., endSeed: 3 }

// Option 2: Longer timeout
test('...', async () => { ... }, 600000) // 10 min
```

### Course Already Exists

```
expect(response.status).toBe(200)
  Expected: 200
  Received: 409 (Conflict)
```

**Fix**: Test cleanup didn't run. Manually delete:

```bash
rm -rf public/vfs/courses/spa_for_eng_s0001-0003
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install

      - name: Start Server
        run: npm run server &
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Wait for Server
        run: npx wait-on http://localhost:3456/api/health

      - name: Run E2E Tests
        run: npm test tests/e2e-course-generation.test.js
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Writing New Tests

### Template

```javascript
test('Your test name', async () => {
  // 1. Setup: Create test data
  const testCourse = { ... }

  // 2. Action: Trigger workflow
  const response = await axios.post(`${BASE_URL}/api/...`, testCourse)

  // 3. Assert: Validate response
  expect(response.status).toBe(200)
  expect(response.data.success).toBe(true)

  // 4. Validate: Check side effects
  const file = await fs.readJson('/path/to/output.json')
  expect(file.version).toBe('7.7.0')

  // 5. Cleanup: Remove test data
  await fs.remove('/path/to/test/data')
})
```

### Best Practices

- ✅ Use `beforeAll` for setup, `afterAll` for cleanup
- ✅ Use descriptive test names
- ✅ Test one thing per test (single assertion focus)
- ✅ Use realistic test data (not mocks)
- ✅ Clean up after tests (delete generated files)
- ✅ Set appropriate timeouts for async operations
- ❌ Don't rely on test execution order
- ❌ Don't use hardcoded timestamps
- ❌ Don't commit generated test files to git

## Next Steps

After E2E tests pass:

1. **Run full 30-seed test** - Change `endSeed: 30` to validate pattern quality
2. **Test Web Mode** - Change to `executionMode: 'web'` to test browser automation
3. **Test Smart Resume** - Run twice to validate resume detection
4. **Load testing** - Run multiple courses in parallel
5. **Production deploy** - Deploy to Vercel with confidence

---

**Version**: 8.0.0
**Last Updated**: 2025-11-10
**Test Coverage**: Course generation workflow (Phases 1, 3, 5, 6, 7)
