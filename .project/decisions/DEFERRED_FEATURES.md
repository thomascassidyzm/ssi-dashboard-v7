# Deferred Features (Pedestals, Not Monkeys)

**Decision Date**: 2025-10-14

These features are valuable but NOT blocking for core functionality. Defer until after proving the monkey works.

---

## 1. Intelligent Course Resume System

**What**: Scan VFS, detect phase completion, resume from incomplete phase
**Value**: Save compute resources, resilience against crashes
**Priority**: MEDIUM (nice to have)
**Status**: DEFERRED

**Brief**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/.project/briefs/INTELLIGENT_COURSE_RESUME.md`

**Why Deferred**:
- Monkey = "Generate quality course from dashboard"
- Resume system doesn't affect quality
- Can manually regenerate if needed for now
- Implement after proving full generation works

---

## 2. APML → HTML Compiler

**What**: Auto-compile APML to formatted HTML for dashboard browsing
**Value**: Better user experience for browsing documentation
**Priority**: MEDIUM (nice to have)
**Status**: DEFERRED

**Requirements**:
- Syntax-highlighted YAML
- Auto-generated navigation/TOC
- Deep linking to phases/sections
- Responsive design
- Build pipeline integration

**Why Deferred**:
- APML content already accessible via API (`/api/apml/full`)
- Raw APML is readable
- HTML version is polish, not functionality
- Implement after core system validated

---

## 3. Advanced Visualizations

**What**: Interactive graphs, dependency trees, learning curves
**Value**: Deeper insights into course structure
**Priority**: LOW (polish)
**Status**: DEFERRED

**Why Deferred**:
- Basic SEED→LEGO visualizer works
- Advanced viz doesn't affect generation quality
- Implement after courses validated

---

## 4. Bulk Course Operations

**What**: Generate multiple courses in parallel, batch quality validation
**Value**: Efficiency at scale
**Priority**: LOW (optimization)
**Status**: DEFERRED

**Why Deferred**:
- Need to prove single course works first
- Parallel generation is optimization, not functionality

---

## Review Criteria

Revisit these after:
- ✅ Chinese course (668 seeds) generated successfully
- ✅ Quality validated (≥85/100)
- ✅ Dashboard generation flow proven
- ✅ Manual testing successful

Then prioritize based on:
1. User pain points
2. Frequency of use
3. Development effort vs value
