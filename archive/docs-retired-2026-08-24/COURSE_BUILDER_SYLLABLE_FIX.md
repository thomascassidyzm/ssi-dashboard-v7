# Course Builder Fix: Syllable-Based Phrase Generation

**Problem:** European language courses have a "missing middle" - too few medium-length phrases (7-12 syllables). Learners jump from short BUILD phrases to very long USE phrases with no smooth progression.

**Root Cause:** Course Builder generates phrases without considering syllable count or targeting specific length distributions.

## Solution: Syllable-Aware Phrase Generation

### 1. Calculate Syllables During Generation

**Where:** `services/course-builder-api.cjs` - when inserting phrases

**Add syllable calculation:**
```javascript
const { countSyllables, getLangFromCourse } = require('../scripts/syllable-counter.cjs');

// When inserting a phrase:
const targetLang = getLangFromCourse(courseCode, true);
const syllableCount = countSyllables(targetText, targetLang);

// Store in database:
await supabase.from('course_practice_phrases').insert({
  ...phraseData,
  target_syllable_count: syllableCount
});
```

### 2. Target Syllable Distribution

**Goal:** 30-40% of USE phrases should be medium-length (7-12 syllables)

**Current distribution (European languages):**
- Very Short (1-3 syl): ~0%
- Short (4-6 syl): ~5%
- Medium (7-12 syl): ~15-20% ← TOO LOW
- Long (13-18 syl): ~25%
- Very Long (19+ syl): ~50%

**Target distribution:**
- Very Short (1-3 syl): ~0%
- Short (4-6 syl): ~10%
- Medium (7-12 syl): **35%** ← INCREASE THIS
- Long (13-18 syl): ~30%
- Very Long (19+ syl): ~25%

### 3. Phrase Generation Strategy

**Modify the phrase generator to:**

1. **Track syllable distribution** as phrases are generated
2. **Bias toward medium-length** when distribution is off
3. **Generate simpler LEGO combinations** for medium phrases

**Algorithm:**
```javascript
function generatePhrases(lego, courseState) {
  const phrases = [];
  const syllableDist = courseState.syllableDistribution;

  // Check if we need more medium phrases
  const mediumPct = syllableDist.medium / syllableDist.total;
  const needMoreMedium = mediumPct < 0.30;

  if (needMoreMedium) {
    // Generate 2-3 medium-length phrases (7-12 syllables)
    phrases.push(...generateMediumPhrases(lego, courseState));
  }

  // Then generate varied length phrases
  phrases.push(...generateVariedPhrases(lego, courseState));

  return phrases;
}

function generateMediumPhrases(lego, courseState) {
  // Strategy for medium phrases:
  // 1. Use 2-3 LEGOs total (not 5-6)
  // 2. Shorter vocabulary words
  // 3. Simple sentence structures

  const mediumPhrases = [];
  const availableLegos = courseState.introducedLegos;

  // Try combining this LEGO with 1-2 others
  for (const otherLego of availableLegos.slice(-20)) {  // Recent LEGOs
    const combined = combineLegos(lego, otherLego);
    const syllables = countSyllables(combined.target, targetLang);

    if (syllables >= 7 && syllables <= 12) {
      mediumPhrases.push(combined);
      if (mediumPhrases.length >= 3) break;
    }
  }

  return mediumPhrases;
}
```

### 4. Validation Gate

**Add syllable distribution check to course stats:**

```javascript
// GET /api/stats/:courseCode
{
  ...existingStats,
  syllable_distribution: {
    use_phrases: {
      veryShort: 0,
      short: 150,
      medium: 1200,  // 35% ← TARGET
      long: 900,
      veryLong: 750,
      total: 3000
    },
    mediumPct: 40.0,  // ← Should be 30-40%
    status: mediumPct >= 30 ? "GOOD" : "NEEDS_MORE_MEDIUM"
  }
}
```

### 5. Course Builder Prompts

**Update the agent prompts to:**

1. **Prioritize medium-length phrases early in course**
   - First 100 seeds: 40% medium
   - Seeds 101-200: 35% medium
   - Seeds 201+: 30% medium

2. **Provide examples of medium phrases**
   ```
   Medium-length phrase examples (7-12 syllables):
   - "I want to speak with you" (8 syllables)
   - "Where do you want to go?" (7 syllables)
   - "I'm trying to learn Italian" (10 syllables)
   ```

3. **Flag when distribution is off**
   ```
   WARNING: Only 15% of phrases are medium-length (target: 35%)
   Please generate more 7-12 syllable phrases using simpler LEGO combinations.
   ```

## Implementation Steps

### Phase 1: Add Syllable Calculation (Immediate)
- [x] Create `syllable-counter.cjs` module
- [x] Install `syllable` npm package
- [ ] Import into Course Builder API
- [ ] Calculate syllables on phrase insert
- [ ] Store in `target_syllable_count` column

### Phase 2: Add Distribution Tracking (Next)
- [ ] Track syllable distribution in course state
- [ ] Add to `/api/stats/:courseCode` endpoint
- [ ] Display in dashboard

### Phase 3: Modify Generation Logic (Next)
- [ ] Implement `generateMediumPhrases()` function
- [ ] Bias generator toward medium when needed
- [ ] Update agent prompts with syllable guidance

### Phase 4: Validation (Final)
- [ ] Add syllable distribution quality gate
- [ ] Warn when mediumPct < 30%
- [ ] Require 30%+ for course approval

## Testing

**Test with new course build:**
1. Create test course with 50 seeds
2. Monitor syllable distribution after each 10 seeds
3. Verify 30-40% medium by seed 50
4. Compare to old courses (15-20% medium)

**Success criteria:**
- New courses achieve 30-40% medium USE phrases
- Distribution improves progressively (40% → 35% → 30%)
- No degradation in phrase quality

## Rollout

1. **Week 1:** Deploy syllable calculation (all new phrases)
2. **Week 2:** Add distribution tracking (monitoring only)
3. **Week 3:** Deploy generation bias (automatic fix)
4. **Week 4:** Enable validation gate (enforcement)

## Migration for Existing Courses

**One-time fix for old courses (fra_for_eng, spa_for_eng, por_for_eng):**

Option A: **Generate additional medium phrases**
- Add 500-1000 medium USE phrases per course
- Integrate into existing LEGO structure
- Regenerate audio for new phrases

Option B: **Mark long phrases for "advanced mode"**
- Keep existing phrases
- Add difficulty levels: beginner/intermediate/advanced
- Filter by syllable count in learning app

**Recommendation:** Option A for critically low courses (0.7-2%), Option B for moderate courses (15-20%)
