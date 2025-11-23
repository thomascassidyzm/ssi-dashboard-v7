# Documentation Update Plan - 2025-11-20

## Overview
Update dashboard documentation to reflect current architecture state after Phase 6 integration and Phase 7 manifest format updates.

## Recent Changes to Document

### 1. Phase 6 Integration into Phase 3
- Phase 6 (introduction generation) is now built into Phase 3 server
- Runs automatically after LEGO extraction (<1s overhead)
- No longer a separate microservice
- Outputs `introductions.json` as part of Phase 3 completion

### 2. Phase 7 Manifest Format Updates
- Added top-level `introduction` field (with placeholders)
- Added `duration` field to all audio samples (placeholder: 0)
- Field ordering matches Italian course reference
- Sample format: `{ duration, id, cadence, role }`

### 3. Linear Pipeline (No Parallelization)
- Pipeline: 1 → 3 (includes 6) → 5 → 7 → 8
- Removed parallel coordination (Phase 5 + Phase 6)
- Simplified orchestrator logic

### 4. Canonical Content System
- Canonical seeds (668) in `public/vfs/canonical/canonical_seeds.json`
- Encouragements per language in `public/vfs/canonical/{lang}_encouragements.json`
- Welcomes template in `public/vfs/canonical/welcomes.json`

### 5. Microservices Architecture
- Phase servers on ports 3457, 3458, 3459, 3462, 3463
- Phase 1: 3457 (Translation + Phase 2 LUT)
- Phase 3: 3458 (LEGO + Phase 6 Introductions)
- Phase 5: 3459 (Baskets)
- Phase 7: 3462 (Manifest)
- Phase 8: 3463 (Audio/TTS)

## Files to Update

### 1. `/public/docs/phase_intelligence/README.md`
**Updates:**
- [ ] Change pipeline flow from `1 → 3 → 5 → 6 → 7 → 8` to `1 → 3 (includes 6) → 5 → 7 → 8`
- [ ] Update Phase 6 status from `✅ ACTIVE` to `🔗 INTEGRATED INTO PHASE 3`
- [ ] Update Phase 6 description to note it's built into Phase 3 server
- [ ] Update "Active Workflow" section
- [ ] Update locked intelligence table
- [ ] Add note about canonical content system

### 2. `/public/docs/phase_intelligence/phase_3_lego_pairs.md`
**Updates:**
- [ ] Add section "Phase 6 Integration"
- [ ] Document that Phase 3 server now outputs both:
  - `lego_pairs.json`
  - `introductions.json`
- [ ] Note execution order: LEGO extraction → Introduction generation
- [ ] Update version to 6.4 or create new version

### 3. `/public/docs/phase_intelligence/phase_6_introductions.md`
**Updates:**
- [ ] Change status from `✅ ACTIVE` to `🔗 INTEGRATED INTO PHASE 3`
- [ ] Add note: "Phase 6 is now integrated into Phase 3 server (port 3458)"
- [ ] Add execution time: "<1 second"
- [ ] Update version to 2.1
- [ ] Keep methodology intact (still used by Phase 3)

### 4. `/public/docs/phase_intelligence/phase_7_compilation.md`
**Updates:**
- [ ] Add section "Manifest Format Requirements"
- [ ] Document top-level `introduction` field:
  ```json
  {
    "id": "",
    "cadence": "natural",
    "role": "presentation",
    "duration": 0
  }
  ```
- [ ] Document `duration` field in samples (placeholder: 0)
- [ ] Update sample structure example to show duration field
- [ ] Update field ordering: `{ duration, id, cadence, role }`
- [ ] Add note: "Placeholders populated by Phase 8"
- [ ] Update version to 1.1

### 5. `/public/docs/phase_intelligence/phase_8_audio_generation.md`
**Updates:**
- [ ] Add section "Duration Field Population"
- [ ] Document that Phase 8 updates duration field after TTS generation
- [ ] Update sample structure to show duration field
- [ ] Update version to 1.1
- [ ] Add note about updating manifest after audio generation

### 6. `/src/views/PhaseIntelligence.vue`
**Updates:**
- [ ] Change Phase 6 status from `'active'` to `'integrated'`
- [ ] Update Phase 6 name to `'Introductions (in Phase 3)'`
- [ ] Update pipeline description
- [ ] Add new status color for 'integrated' (e.g., teal)

### 7. Create `/public/docs/phase_intelligence/CANONICAL_CONTENT.md`
**New File:**
- [ ] Document canonical seeds structure
- [ ] Document encouragements structure (pooled + ordered)
- [ ] Document welcomes template
- [ ] Explain language-agnostic design
- [ ] Show file locations in `public/vfs/canonical/`

### 8. Create `/docs/COURSE_GENERATION_ARCHITECTURE.md` (Already exists!)
**Updates:**
- [ ] Move to `/public/docs/phase_intelligence/`
- [ ] Add to dashboard navigation
- [ ] Link from README

### 9. Update `/docs/SYSTEM.md`
**Updates:**
- [ ] Update microservices architecture section
- [ ] Update phase server ports
- [ ] Update pipeline flow diagram
- [ ] Add canonical content section

## Implementation Order

1. **Phase 6 documentation** (mark as integrated)
2. **Phase 3 documentation** (add Phase 6 integration note)
3. **Phase 7 documentation** (new manifest format)
4. **Phase 8 documentation** (duration population)
5. **README** (update pipeline flow and status table)
6. **Create CANONICAL_CONTENT.md** (new documentation)
7. **PhaseIntelligence.vue** (UI updates)
8. **SYSTEM.md** (architecture overview)

## Verification

After updates:
- [ ] Dashboard "Phase Intelligence" page shows correct status
- [ ] Phase 6 marked as integrated
- [ ] Pipeline flow clearly shows linear progression
- [ ] Canonical content documented
- [ ] All manifest format requirements documented
- [ ] Ready for Kai to implement Phase 8

## Notes

- Keep all existing methodology intact (don't change how agents work)
- Focus on structural/architectural documentation
- Maintain version history in each file
- Update "Last Updated" dates
- Add changelog entries where appropriate
