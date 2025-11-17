# Testing feature/layered-automation Branch

## Quick Test Results ✅

### Automated Tests (No Token Usage)

✅ **Phase 3 Parametrization** - All test cases pass
- Small test (10 seeds): 2 segments, 4 agents
- Medium (50 seeds): 1 segment, 5 agents
- Large (668 seeds): 7 segments, 67 agents

✅ **Phase 5 Parametrization** - Load estimates correct
- Small (58 LEGOs): Single batch recommended
- Large (2949 LEGOs): Medium segments recommended

✅ **Syntax Validation** - All files parse correctly
- `automation_server.cjs` ✓
- `course-validator.cjs` ✓
- `phase-deep-validator.cjs` ✓

✅ **CLI Tools** - Both validators work standalone
```bash
node course-validator.cjs spa_for_eng        # Basic validation
node phase-deep-validator.cjs spa_for_eng    # Deep validation
```

## Manual Testing Required

Since the feature branch won't auto-deploy to Vercel, you'll need to test locally:

### 1. Start Development Environment

```bash
# Terminal 1: Start Vite dev server (frontend)
npm run dev
# Opens on http://localhost:5173

# Terminal 2: Start automation server (backend)
npm run server
# Opens on http://localhost:3456
```

### 2. Test Validation UI

1. Visit: `http://localhost:5173`
2. Click: **🔍 Validate & Fix Courses**
3. You should see:
   - List of all courses with progress bars
   - Click a course to see details
   - Click **🔬 Deep Dive** button to see content validation

### 3. Test API Endpoints Directly

```bash
# Basic validation
curl http://localhost:3456/api/courses/spa_for_eng/validate | jq

# Deep validation
curl http://localhost:3456/api/courses/spa_for_eng/validate/deep | jq

# All courses
curl http://localhost:3456/api/courses/validate/all | jq
```

### 4. Test Phase Services (If Refactored)

If the other agent extracted phase services:

```bash
# Check if services exist
ls -la services/validation/

# Test Phase 3 parametrization endpoint (if exists)
curl -X POST http://localhost:3458/api/phase3/calculate-segments \
  -H "Content-Type: application/json" \
  -d '{"totalSeeds": 668}'
```

## What to Watch For

### ⚠️ Common Issues

1. **CORS errors** - Make sure automation_server.cjs allows `localhost:5173`
2. **Missing routes** - Validation endpoints might be moved/refactored
3. **Import errors** - Check `require()` paths after refactoring
4. **Port conflicts** - Make sure 3456, 3458, 3459 are free

### ✓ Signs of Success

1. Dashboard loads at `http://localhost:5173`
2. "Validate & Fix Courses" card appears
3. Clicking it shows course list
4. Deep dive shows detailed stats and issues
5. No console errors in browser dev tools
6. No errors in automation_server terminal

## Testing Checklist

- [ ] Frontend builds without errors (`npm run dev`)
- [ ] Backend starts without errors (`npm run server`)
- [ ] Dashboard shows validation card
- [ ] `/validate` route works
- [ ] Course list loads
- [ ] Course details show
- [ ] Deep dive button works
- [ ] Deep validation shows real data
- [ ] CLI validators still work
- [ ] No broken imports/requires

## Deploying to Vercel (When Ready)

Since feature branches don't auto-deploy, you'll need to:

1. **Merge to main** (after testing)
   ```bash
   git checkout main
   git merge feature/layered-automation
   git push origin main
   ```

2. **Or create preview deployment**
   ```bash
   # Install Vercel CLI if needed
   npm i -g vercel

   # Deploy preview
   vercel
   ```

3. **Or manually trigger Vercel**
   - Go to Vercel dashboard
   - Create deployment from `feature/layered-automation` branch
   - Set environment variables if needed

## Environment Variables for Vercel

Make sure these are set in Vercel project settings:

```
VITE_API_BASE_URL=http://localhost:3456  (for local testing)
# Or your automation server URL for production
```

## Quick Debug Commands

```bash
# Check current branch
git branch --show-current

# See what's changed from main
git diff main --name-only

# Test a specific validator
node course-validator.cjs cmn_for_eng

# Run parametrization tests
node test-phase-parametrization.cjs

# Check if server has syntax errors
node -c automation_server.cjs

# See if ports are in use
lsof -i :3456
lsof -i :5173
```

## Test Coverage Summary

| Component | Test Type | Status |
|-----------|-----------|--------|
| Phase 3 Parametrization | Unit (Logic) | ✅ PASS |
| Phase 5 Parametrization | Unit (Logic) | ✅ PASS |
| Course Validator CLI | Integration | ✅ PASS |
| Deep Validator CLI | Integration | ✅ PASS |
| Validation API | Manual Required | ⏳ TODO |
| Validation UI | Manual Required | ⏳ TODO |
| Phase Services | Manual Required | ⏳ TODO |

---

**Ready to test locally!** Just run `npm run dev` and `npm run server` in separate terminals.
