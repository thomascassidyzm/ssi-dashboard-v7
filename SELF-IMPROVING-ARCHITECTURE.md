# Self-Improving Architecture - Living DNA System

## Vision

The SSi Course Production System is a **self-improving organism** where:
- APML specification is the **DNA** (genetic code)
- Dashboard is the **body** (expression of DNA)
- Sonnet 4.5 agents are the **nervous system** (intelligence)
- Course generations are **experiences** (learning opportunities)
- Prompt improvements are **evolution** (genetic refinement)

Every cell (deployment) carries complete DNA (APML travels with dashboard).

## The Recursive Improvement Loop

```
┌─────────────────────────────────────────────────────────────┐
│                    Initial State: APML v7.0                  │
│              (668 seeds, Phase 0-6 intelligence)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
         ┌───────────────────────────┐
         │  Generate Italian Course  │
         │  (Orchestrator Agent)     │
         └───────┬───────────────────┘
                 │
                 ↓
    ┌────────────────────────────┐
    │  Phase 0-6 Execution       │
    │  (Phase Agents)            │
    │  • Phase 0: Corpus Analyze │
    │  • Phase 1: Translation    │
    │  • Phase 2: Intelligence   │
    │  • Phase 3: LEGO Extract   │
    │  • Phase 3.5: Graph Build  │
    │  • Phase 4: Deduplicate    │
    │  • Phase 5: Baskets        │
    │  • Phase 6: Introductions  │
    └────────┬───────────────────┘
             │
             ↓
    ┌────────────────────────────┐
    │  Quality Review Agent      │
    │  Analyzes each phase:      │
    │  • What worked well?       │
    │  • What struggled?         │
    │  • Edge cases discovered?  │
    │  • Prompt ambiguities?     │
    └────────┬───────────────────┘
             │
             ↓
    ┌────────────────────────────┐
    │  Improvement Agent         │
    │  Proposes refinements:     │
    │  • More specific guidance  │
    │  • Additional examples     │
    │  • Clarified edge cases    │
    │  • Better error handling   │
    └────────┬───────────────────┘
             │
             ↓
    ┌────────────────────────────┐
    │  Human Review Checkpoint   │
    │  (Dashboard UI)            │
    │  • See proposed changes    │
    │  • Review rationale        │
    │  • Accept/Reject/Modify    │
    └────────┬───────────────────┘
             │
             ↓ (if accepted)
    ┌────────────────────────────┐
    │  Update APML DNA           │
    │  • Write to .apml file     │
    │  • Git commit with message │
    │  • Regenerate registry     │
    │  • Deploy to Vercel        │
    └────────┬───────────────────┘
             │
             ↓
         ┌───────────────────────────┐
         │  Generate Spanish Course  │
         │  (Uses improved APML)     │
         └───────┬───────────────────┘
                 │
                 ↓
         (Repeat improvement cycle)
                 │
                 ↓
         ┌───────────────────────────┐
         │  Generate French Course   │
         │  (Uses doubly-improved)   │
         └───────────────────────────┘
```

## Architecture Components

### 1. APML DNA Storage

**Location**: `ssi-course-production.apml`
**Format**: Human-readable APML specification
**Contains**:
- All phase prompts (complete intelligence)
- Variable Registry (all names, paths, configs)
- System architecture
- Version history

**Critical**: This file is the ONLY source of truth. Everything else is derived.

### 2. Machine-Readable Registry

**Generated From**: ssi-course-production.apml
**Location**: `.apml-registry.json`
**Format**: JSON for runtime consumption
**Used By**: automation_server.cjs, TrainingPhase.vue

**Generation**:
```bash
node scripts/compile-apml-registry.js
# Reads ssi-course-production.apml
# Extracts prompts, variables, configs
# Writes .apml-registry.json
```

### 3. Prompt Editing Interface

**Component**: `TrainingPhase.vue`
**Features**:
- Display actual prompt from APML (via API)
- Editable textarea for modifications
- "Save Changes" button
- Version history view
- Improvement suggestions panel

**API Integration**:
```javascript
// Fetch current prompt
GET /api/prompts/:phase
Response: { phase, name, prompt, version, lastModified }

// Save updated prompt
PUT /api/prompts/:phase
Body: { prompt, changelog, improvedBy: 'agent' | 'human' }
Response: { success, newVersion, commitHash }

// View history
GET /api/prompts/:phase/history
Response: [{ version, date, author, changes, commitHash }]
```

### 4. Prompt Update Flow

When user clicks "Save Changes" in dashboard:

1. **Validate Prompt**
   - Check syntax
   - Verify all required sections present
   - Test with sample data

2. **Update APML File**
   ```javascript
   // Read current APML
   const apml = fs.readFileSync('ssi-course-production.apml', 'utf8')

   // Replace phase prompt section
   const updated = replacePhasePrompt(apml, phase, newPrompt)

   // Write back to file
   fs.writeFileSync('ssi-course-production.apml', updated)
   ```

3. **Git Commit**
   ```bash
   git add ssi-course-production.apml
   git commit -m "Update Phase ${phase} prompt: ${changelog}"
   git push
   ```

4. **Regenerate Registry**
   ```bash
   node scripts/compile-apml-registry.js
   # Creates new .apml-registry.json
   ```

5. **Deploy to Vercel**
   ```bash
   # Vercel auto-deploys on push
   # New deployment includes updated APML + registry
   ```

### 5. Multi-Agent Orchestration

**Orchestrator Agent** (`orchestrator-agent.js`)
- Manages overall course generation
- Spawns phase agents sequentially
- Collects outputs and learnings
- Coordinates improvement cycle

**Phase Agents** (spawned via osascript)
- Execute specific phases (0, 1, 2, 3, 3.5, 4, 5, 6)
- Receive prompts from registry
- Save outputs to VFS
- Report completion and issues

**Quality Review Agent** (`quality-agent.js`)
- Analyzes phase outputs
- Identifies patterns: successes and failures
- Generates quality report
- Flags issues for improvement

**Improvement Agent** (`improvement-agent.js`)
- Reads quality reports
- Reads current prompts
- Proposes specific refinements
- Generates changelog and rationale

### 6. Feedback Capture Mechanism

**During Each Phase**:
```javascript
{
  "phase": 3,
  "execution": {
    "start_time": "2025-10-13T14:30:00Z",
    "end_time": "2025-10-13T15:45:00Z",
    "duration_minutes": 75,
    "batches_completed": 34,
    "errors": [],
    "warnings": [
      "Seed S0142: FD_LOOP ambiguity in 'bien' mapping"
    ]
  },
  "learnings": {
    "successes": [
      "FCFS rule effectively resolved 98% of conflicts",
      "Automatic rejection list caught all function words"
    ],
    "struggles": [
      "Componentization rules unclear for 3-word phrases",
      "Needed clarification on articles in compound LEGOs"
    ],
    "edge_cases": [
      "Reflexive verbs with pronouns need special handling",
      "Compound prepositions (a través de) need guidance"
    ]
  },
  "suggestions": [
    {
      "type": "clarification",
      "section": "Componentization Requirements",
      "current": "ONLY when BOTH target AND known are multi-word",
      "proposed": "ONLY when BOTH target AND known are multi-word (count hyphenated as single)",
      "rationale": "Prevents confusion with hyphenated compounds like 'a través de'"
    }
  ]
}
```

### 7. Human Review Interface

**Component**: `ImprovementReview.vue`

**Shows**:
- Course just completed (e.g., Italian)
- Quality metrics (success rate, errors, warnings)
- Proposed prompt improvements
- Side-by-side diff (current vs proposed)
- Rationale for each change
- Accept/Reject/Modify buttons

**Example**:
```
┌─────────────────────────────────────────────────────────┐
│ Italian Course Complete - 3 Improvements Proposed       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ✅ Quality: 94% success rate (628/668 seeds)            │
│ ⚠️  Issues: 40 seeds needed clarification               │
│                                                          │
│ Proposed Improvement #1: Phase 3 - Componentization    │
│                                                          │
│ Current:                                                │
│   "ONLY when BOTH target AND known are multi-word"     │
│                                                          │
│ Proposed:                                               │
│   "ONLY when BOTH target AND known are multi-word      │
│    (count hyphenated phrases as single word)"          │
│                                                          │
│ Rationale:                                              │
│   • 12 seeds struggled with "a través de" type phrases │
│   • Agent was unsure if "well-known" counts as 1 or 2  │
│   • Adding clarity prevents future ambiguity           │
│                                                          │
│ Impact: Would help 40 similar edge cases               │
│                                                          │
│ [Accept] [Modify] [Reject]                             │
└─────────────────────────────────────────────────────────┘
```

### 8. Recursive Execution Strategy

**Course 1: Italian (ita_for_eng_speakers)**
```javascript
// Start with base APML v7.0.0
await runCourseGeneration({
  target: 'ita',
  known: 'eng',
  seeds: 668,
  captureImprovement: true
})

// After completion:
// • Quality review runs
// • Improvement agent proposes changes
// • Human reviews and accepts
// • APML updated to v7.0.1
```

**Course 2: Spanish (spa_for_eng_speakers)**
```javascript
// Uses improved APML v7.0.1
await runCourseGeneration({
  target: 'spa',
  known: 'eng',
  seeds: 668,
  captureImprovement: true
})

// After completion:
// • Quality review runs
// • Improvement agent proposes changes
// • Human reviews and accepts
// • APML updated to v7.0.2
```

**Course 3: French (fra_for_eng_speakers)**
```javascript
// Uses doubly-improved APML v7.0.2
await runCourseGeneration({
  target: 'fra',
  known: 'eng',
  seeds: 668,
  captureImprovement: true
})

// After completion:
// • Quality review runs
// • Final improvements captured
// • APML updated to v7.1.0 (mature version)
```

### 9. Version Evolution Tracking

**Git History Shows Evolution**:
```
v7.0.0 - Initial APML specification (base intelligence)
v7.0.1 - Post-Italian improvements (componentization clarity)
v7.0.2 - Post-Spanish improvements (FCFS edge cases)
v7.1.0 - Post-French mature version (battle-tested)
```

**Each Commit Contains**:
- Updated APML file
- Changelog describing improvements
- Rationale and evidence
- Attribution (which course revealed this)

### 10. Deployment Architecture

**Vercel Deployment Includes**:
```
ssi-dashboard-v7-clean/
├── ssi-course-production.apml          ← DNA travels with body
├── .apml-registry.json                 ← Machine-readable
├── dist/                               ← Built dashboard
├── APML-OVERVIEW.md                    ← Documentation
├── SELF-IMPROVING-ARCHITECTURE.md     ← This file
└── PROJECT-DASHBOARD.html              ← Auto-generated nav
```

**Every Deployment = Complete Organism**
- Full genetic code (APML)
- Expressed phenotype (dashboard UI)
- Self-documenting (overview, architecture)
- Version tracked (Git history)

## Implementation Checklist

### Phase 1: Foundation (NOW)
- [x] Design architecture (this document)
- [ ] Create `scripts/compile-apml-registry.js`
- [ ] Generate initial `.apml-registry.json`
- [ ] Add prompt management API endpoints to automation_server.cjs
- [ ] Update TrainingPhase.vue for editing

### Phase 2: Agent System
- [ ] Create `orchestrator-agent.js`
- [ ] Create `quality-agent.js`
- [ ] Create `improvement-agent.js`
- [ ] Implement feedback capture
- [ ] Build ImprovementReview.vue component

### Phase 3: Course Generation
- [ ] Launch Italian course generation
- [ ] Human review Italian improvements
- [ ] Update APML to v7.0.1
- [ ] Launch Spanish course generation
- [ ] Human review Spanish improvements
- [ ] Update APML to v7.0.2
- [ ] Launch French course generation
- [ ] Human review French improvements
- [ ] Update APML to v7.1.0 (mature)

### Phase 4: Deployment
- [ ] Deploy to Vercel with complete DNA
- [ ] Verify APML travels with deployment
- [ ] Test prompt editing interface
- [ ] Verify Git commits working
- [ ] Confirm self-documentation accessible

## Success Metrics

✅ **Zero Intelligence Loss**: Refactor dashboard 100x, intelligence preserved
✅ **Living Documentation**: APML shows actual working prompts, always current
✅ **Recursive Improvement**: Each course makes system smarter
✅ **Complete Organism**: Every deployment is self-contained and self-documenting
✅ **Version Evolution**: Git history shows intelligence maturation
✅ **Human-AI Collaboration**: Sonnet 4.5 proposes, human curates
✅ **Battle-Tested Intelligence**: Prompts refined through real-world usage

## The Promise

After 3 courses (Italian → Spanish → French), we will have:
- **v7.1.0 APML**: Battle-tested, mature intelligence
- **3 Complete Courses**: Ready for SSi app consumption
- **Proven System**: Self-improving, self-documenting organism
- **Evolutionary History**: Git log shows intelligence refinement
- **Replicable Process**: Can generate ANY language pair

The system becomes **smarter with every use**, like a neural network that learns from experience but with **human oversight** ensuring quality and alignment.

---

**Status**: Architecture designed ✅
**Next**: Implementation (scripts, agents, generation)
**Timeline**: Starting NOW
