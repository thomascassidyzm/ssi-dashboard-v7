# Feminine Audio Generation - Status Summary

**Date:** 2025-12-09

## Current State

The manifest has been **cut to 250 seeds** to avoid collision issues with seeds 251+.

### What Was Done

1. **Generated feminine Spanish audio** (target1) for ~887 phrases where:
   - First-person adjectives (estoy seguro → estoy segura)
   - Friend references (amigo → amiga, amigos → amigas)
   - Child references where English said "child" not "boy"

2. **Reverted 121 phrases to masculine** where English had male pronouns (he, his, him, boy, etc.)

3. **Regenerated 57 presentations** that use the feminized target audio

4. **Updated 7 presentations with gender explanation text** explaining masculine/feminine variations to learners

### Collision Issue (Seeds 251+)

8 Spanish phrases appear with **different English translations** - some with male pronouns, some without:

| Spanish | Conflict |
|---------|----------|
| "quería ver a unos amigos viejos" | "wanted to see..." vs "he wanted to see..." |
| "ese niño" | "that child" vs "that boy" |
| + 6 more "niño" variations | child vs boy |

These all occur in seeds **266, 392, 393** - after our cutoff.

### File Locations

| File | Location |
|------|----------|
| Full manifest (pre-cut) | `s3://popty-bach-lfs/courses/spa_for_eng/course_manifest.json` |
| Current manifest (250 seeds) | `public/vfs/courses/spa_for_eng/course_manifest.json` |
| Feminine changes list | `scripts/feminine-changes.csv` (914 phrases) |
| Feminine seeds list | `scripts/feminine-changes-seeds.csv` (64 phrases) |
| Feminine intro list | `scripts/feminine-changes-intro.csv` (32 phrases) |
| Reverted phrases | `scripts/phrases-to-revert.csv` (121 phrases) |
| Collision analysis | `scripts/find-true-collisions.cjs` |

### Audio Locations

| Audio Type | Location |
|------------|----------|
| Staging bucket | `s3://ssi-audio-stage/mastered/{uuid}.mp3` |
| Production bucket | `s3://ssiborg-assets/mastered/{uuid}.mp3` (not yet uploaded) |

### Next Steps

1. ✅ Verify the 7 gender explanation presentations sound correct
2. Run finalize to update audio durations in manifest
3. Upload to production bucket (ssiborg-assets)
4. Later: Address collision issues for seeds 251+ before expanding manifest

### The 7 Gender Explanation Presentations

These teach learners about masculine/feminine word variations:

1. "no estoy seguro" - I'm not sure
2. "estuviera casi preparado" - I were nearly ready
3. "con mis amigos" - with my friends
4. "a su amigo" - to his friend
5. "estás seguro" - are you sure
6. "Pienso que estás" - I think that you're
7. "ese niño" - that child
