# Kai Quickstart - Course Builder

Your environment is already set up. Here's what you need for building courses.

## Pull Latest & Restart

```bash
git pull
pm2 restart all
```

## Course Builder API

**Port:** 3471 (proxied through orchestrator at 3456)

**Key endpoints:**
```
POST /api/seed/complete              # Submit seed + LEGOs + phrases
GET  /api/seeds/zho_for_eng          # Get canonical seeds list
GET  /api/balance/zho_for_eng?seed=N # Check underused/overused LEGOs
GET  /api/vocab/zho_for_eng          # Current vocabulary
GET  /api/stats/zho_for_eng          # Course statistics
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
| 1. TILING | Seed tiles from LEGOs | `/ssi-decompose-seed` |
| 2. ZUT | Same known = same target | `/ssi-decompose-seed` |
| 3. VOCAB | Phrases use known vocab only | `/ssi-learner-pattern` |
| 4. COUNT | Min 7 phrases per LEGO | `/ssi-build-phrases` |
| 5. ETERNAL | 4+ phrases with 10+ chars | `/ssi-build-phrases` |
| 6. COMPONENTS | M-LEGOs need breakdowns | `/ssi-decompose-seed` |
| 7. BALANCE | Vocabulary variety (3-strike) | `/ssi-phrase-variety` |

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

`ita_for_eng` is wiped and ready for building from seed 1.

---

Build away!
