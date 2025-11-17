# Phase 7 Encouragement Error - Example Output

## Scenario
Running Phase 7 on a course where the source language encouragements don't exist yet.

Example: `spa_for_fra_30seeds` (Spanish for French speakers)
- Source language: French (fra)
- Missing file: `vfs/canonical/fra_encouragements.json`

## Error Output

```
📦 Phase 7: Compile Course Manifest
Course: spa_for_fra_30seeds

❌ MISSING ENCOURAGEMENTS FOR FRA

Expected file: /Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/vfs/canonical/fra_encouragements.json

📖 TO CREATE ENCOURAGEMENTS:
   1. Read the translation instructions:
      docs/phase_intelligence/translate_encouragements.md

   2. Follow the markdown instructions to translate from English canonical

   3. Input:  vfs/canonical/eng_encouragements.json
      Output: vfs/canonical/fra_encouragements.json

   4. The instructions include:
      - Translation guidelines for fra
      - Tone and style requirements (warm, conversational, informal)
      - UUID preservation rules
      - Validation checklist
      - Example translations

💡 TIP: Encouragements are spoken in the SOURCE language (known language).
        For this course, that's FRA.

Phase 7 cannot proceed without encouragements.

❌ Phase 7 failed: Missing encouragements file: /Users/kaisaraceno/Documents/GitHub/ssi-dashboard-v7/vfs/canonical/fra_encouragements.json
```

## What Claude Code Should Do

When seeing this error, Claude Code should:

1. **Read the instructions**: Open `docs/phase_intelligence/translate_encouragements.md`

2. **Understand the task**:
   - Translate from English canonical to the source language (FRA in this example)
   - Input: `vfs/canonical/eng_encouragements.json`
   - Output: `vfs/canonical/fra_encouragements.json`

3. **Follow the guidelines**:
   - Use informal "tu" form (not formal "vous")
   - Keep warm, conversational, encouraging tone
   - Preserve all UUIDs from English source
   - Validate grammar and naturalness

4. **Create the file**: Write the translated encouragements to the correct location

5. **Retry Phase 7**: Run the phase7-compile-manifest.cjs script again

## Currently Available Encouragements

As of 2025-10-28:
- ✅ `eng_encouragements.json` (26 pooled, 48 ordered)

## To Add New Languages

For each new source language (known language), create:
```
vfs/canonical/{language_code}_encouragements.json
```

Examples:
- Spanish courses (for Spanish speakers): `spa_encouragements.json`
- French courses (for French speakers): `fra_encouragements.json`
- Italian courses (for Italian speakers): `ita_encouragements.json`
- German courses (for German speakers): `deu_encouragements.json`
- Mandarin courses (for Mandarin speakers): `cmn_encouragements.json`

## Error Prevention

Before running Phase 7, verify:
```bash
# Check if encouragements exist for your source language
ls -la vfs/canonical/{known_lang}_encouragements.json

# Example for French
ls -la vfs/canonical/fra_encouragements.json
```

If the file doesn't exist, translate it first using the instructions in `docs/phase_intelligence/translate_encouragements.md`.
