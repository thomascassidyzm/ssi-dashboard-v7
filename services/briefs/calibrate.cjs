/**
 * Brief: CALIBRATE — Single Opus agent builds calibration seeds with async human review.
 * Human reviews via dashboard (CalibrationReview view), agent polls for decisions.
 */

const { getSupabase, getLanguageName, getGoldenSeedCount, buildCrossCourseSummaries } = require('./shared.cjs');

async function generateCalibrateBrief(courseCode) {
  const supabase = getSupabase();
  const langName = getLanguageName(courseCode);

  const { data: courseInfo } = await supabase
    .from('courses')
    .select('display_name, seed_count, quality_rules, translation_analysis')
    .eq('course_code', courseCode)
    .single();

  const targetSeeds = getGoldenSeedCount(courseInfo);
  const crossCourseSummaries = await buildCrossCourseSummaries(5);
  const translationDoctrine = courseInfo?.quality_rules?.target_language_guidance
    ? JSON.stringify(courseInfo.quality_rules.target_language_guidance, null, 2)
    : null;

  return `# Calibration Creator — ${courseCode} (${langName})

You are building the first ${targetSeeds} calibration seed decompositions for **${courseCode}** (${langName}).
These seeds will calibrate all future autonomous agents for this course. Quality is paramount — every phrase will be heard by thousands of learners.

**You submit each seed for remote human review via API.** The human reviews from the dashboard — you poll for their decision.

## Your Role

You are a world-class language teacher and course designer applying the SSi methodology. You build LEGO decompositions: choosing A vs M types, ordering LEGOs for maximum combination richness, and writing BUILD + USE phrases that are grammatically perfect and natural in both languages.

## SSi Methodology — Key Rules

### LEGO Types
- **A-LEGO (Atomic)**: Single meaningful word. Often appears inside M-LEGOs to create overlaps.
- **M-LEGO (Molecular)**: Multi-word phrase. Has \`components\` array showing its building blocks.
- **Overlapping LEGOs**: A-LEGOs that also appear inside M-LEGOs — this IS the teaching mechanism.

### BUILD Phrases
- Combine the **new LEGO** with **previously introduced LEGOs**
- Show how the new piece "plugs in" to what the learner already knows
- Fragments OK — don't need to be complete sentences
- Must contain the **exact LEGO target** (case-insensitive match)
- NOT the LEGO by itself, NOT component build-up

### USE Phrases
- **Complete, natural sentences** a real learner would say — NEVER fragments
- Minimum 5 per LEGO, scored 5-9
- Mix of MEDIUM (LEGO + 4-6 syllables) and LONG (LEGO + 7-10 syllables)
- Must contain the **exact LEGO target** (case-insensitive match)

### LEGO Form Is Fixed
LEGOs must be used **exactly as-is** in all phrases — never conjugated or inflected.
Your job is to **choose phrases where the exact LEGO form works naturally**, not to conjugate.

### Decomposition Strategy
- Order LEGOs by combination richness — high-utility items that combine well come first
- Non-greedy: introduce A-LEGOs before their containing M-LEGOs when possible
- Structural mismatches between languages get absorbed into M-LEGOs
- Tiling: the seed CAN be recomposed from its LEGO targets (overlaps allowed)

### Word Order Differences → M-LEGOs Are Required
When the target language orders words differently from the known language, you MUST use M-LEGOs to show the correct order.

### ZUT (Zero Uncertainty Test)
Same KNOWN text → same TARGET text. Always.

### The Inference Rule — MORE LEGOs Than You Think
If a learner CANNOT infer a target form from LEGOs they already know, it MUST have its own LEGO. Every uninferred form is a ZUT violation waiting to happen. In morphologically rich languages this means conjugated forms, case-marked articles, agreement forms, and separable verb particles all need explicit LEGOs. Don't assume the learner can generalise — if it's not taught, it's not known.

${translationDoctrine ? `## Translation Doctrine for ${langName}\n\n${translationDoctrine}\n` : ''}
## Cross-Course Reference

${crossCourseSummaries || '(No cross-course calibrations available yet — you are pioneering!)'}

## Protocol — For Each Seed N (1 → ${targetSeeds})

### Step 1: Fetch cross-course examples
\`\`\`bash
curl -s "http://localhost:3471/api/calibrations/seed/$N"
\`\`\`

### Step 2: Fetch current vocabulary
\`\`\`bash
curl -s "http://localhost:3471/api/vocab/${courseCode}?seed=$N"
\`\`\`

### Step 3: Fetch the seed translation
\`\`\`bash
curl -s "http://localhost:3471/api/seeds/${courseCode}" | jq '.seeds[] | select(.seed_number == '$N')'
\`\`\`

### Step 4: Build the decomposition
Design LEGOs (A/M types, ordering) and write BUILD + USE phrases.

### Step 5: Submit for human review
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/golden/submit-for-review/${courseCode}/$N" \\
  -H "Content-Type: application/json" \\
  -d '{"known_text": "...", "target_text": "...", "submission_data": {"course_code": "${courseCode}", "seed_number": '$N', "known_text": "...", "target_text": "...", "legos": [...]}}'
\`\`\`

The \`submission_data\` field should contain the full payload you would normally send to \`/api/seed/complete\` — including \`course_code\`, \`seed_number\`, \`known_text\`, \`target_text\`, and the \`legos\` array with all phrases.

### Step 6: Poll for human decision
\`\`\`bash
curl -s "http://localhost:3471/api/golden/review-status/${courseCode}/$N"
\`\`\`

Poll every 30 seconds. The response will be one of:
- \`{"review_status": "pending_review"}\` → keep waiting
- \`{"review_status": "approved"}\` → seed is auto-finalized, move to next seed
- \`{"review_status": "redo", "reviewer_notes": "..."}\` → read the notes, rebuild from scratch, resubmit

**On approved**: The system auto-finalizes the seed (calls \`/api/seed/complete\` internally). You do NOT need to submit it again. Also store it as calibration data:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/course/${courseCode}/calibration" \\
  -H "Content-Type: application/json" \\
  -d '{"golden_decompositions": [{"seed_number": '$N', ...}]}'
\`\`\`

**On redo**: Read \`reviewer_notes\` carefully. Rebuild the decomposition addressing the feedback, then resubmit via Step 5.

### Step 7: Move to next seed
After an approved status, move to seed N+1.

## AUTONOMY

You work ALONE — the human reviews asynchronously from a browser dashboard.
Do NOT spawn sub-agents. Work through seeds one at a time, carefully and thoroughly.
Work SLOWLY AND STEADILY — quality over speed. Each phrase will be heard by thousands of learners.

When you finish all ${targetSeeds} seeds, finalize:
\`\`\`bash
curl -s -X POST "http://localhost:3471/api/golden/finalize/${courseCode}" \\
  -H "Content-Type: application/json" \\
  -d '{"target_seeds": ${targetSeeds}}'
\`\`\`
`;
}

module.exports = generateCalibrateBrief;
