# Kai Quickstart - Course Builder

Your environment is already set up. Here's what you need for building courses.

## Important: This is a LANGUAGE Task

**You are an LLM. This is a language task. Never write scripts or try to automate.**

- Build seeds ONE AT A TIME with careful attention to language
- Don't write batch processors or "efficiency" scripts
- Steady, meticulous work produces the best results
- Each seed deserves thoughtful LEGO decomposition and varied phrases
- The API validates quality - trust the process, don't try to shortcut it

## CRITICAL: Canonical Seeds

**The English seed sentences are ALREADY IN THE DATABASE. Do NOT make them up.**

1. First, get the canonical seed: `GET /api/seeds/ita_for_eng`
2. Find the next seed with empty `target_text`
3. Translate THAT sentence into the target language
4. Build LEGOs and phrases for THAT sentence

```bash
# Get seed 1 to see what you need to translate
curl -s "http://localhost:3471/api/seeds/ita_for_eng" | jq '.seeds[0]'
# Returns: { "seed_number": 1, "known_text": "I want to speak Italian with you now.", "target_text": "" }
```

The `known_text` is fixed. You provide `target_text` + LEGOs + phrases.

## Pull Latest & Restart

```bash
git pull
pm2 restart all
```

## Course Builder API

**Port:** 3471 (proxied through orchestrator at 3456)

**Key endpoints:**
```
GET  /api/seeds/ita_for_eng          # Get canonical seeds (known_text is fixed!)
POST /api/seed/complete              # Submit translation + LEGOs + phrases
GET  /api/balance/ita_for_eng?seed=N # Check underused/overused LEGOs
GET  /api/vocab/ita_for_eng          # Current vocabulary
GET  /api/stats/ita_for_eng          # Course statistics
```

## Balance Endpoint (Important!)

Before building each seed, check the balance:
```bash
curl "http://localhost:3471/api/balance/zho_for_eng?seed=51"
```

Returns:
- `underused_legos` - LEGOs needing more practice (prioritize these!)
- `overused_legos` - LEGOs used too much (avoid overusing)
- `strikes` - Current violation count (resets on compliant submission)

## Validation Gates (7 total)

All enforced automatically - rejection includes methodology hints:

| Gate | What | On Fail |
|------|------|---------|
| 1. TILING | Seed tiles from LEGOs | `ralph-methodology.md` |
| 2. ZUT | Same known = same target | `ralph-methodology.md` |
| 3. VOCAB | Phrases use known vocab only | `ralph-methodology.md` |
| 4. COUNT | Min 7 phrases per LEGO | `ralph-methodology.md` |
| 5. TIERS | 2+ SHORT, 2+ MEDIUM, 4+ LONG | `ralph-methodology.md` |
| 6. COMPONENTS | M-LEGOs need breakdowns | `ralph-methodology.md` |
| 7. BALANCE | Vocabulary variety (3-strike) | `ralph-methodology.md` |

### Phrase Length Tiers (Gate 5)

Each LEGO needs balanced phrase lengths:
- **SHORT** (3-5 chars): 2-3 phrases - quick recall
- **MEDIUM** (6-9 chars): 2-3 phrases - building complexity
- **LONG** (10+ chars): 4-5 phrases - full sentences for retention

### Balance Gate (new)

- Tracks practice score per LEGO: `phrase_count / seeds_since_introduction`
- Flags underused (<0.3x) and overused (>1.5x) LEGOs
- Strike 1-2: warning, accepts anyway
- Strike 3: REJECT - must include underused LEGOs
- Resets on compliant submission

## Useful Commands

```bash
# Check course stats
curl http://localhost:3471/api/stats/ita_for_eng

# View recent activity
pm2 logs course-builder --lines 30

# Wipe course (fresh start)
curl -X DELETE http://localhost:3471/api/course/ita_for_eng
```

## Current Status

Both courses are wiped and ready for fresh builds:
- `ita_for_eng` - 260 canonical seeds ready (target_text empty)
- `zho_for_eng` - 250 canonical seeds ready (target_text empty)

---

Build away!
