# Azure → Cartesia, four daily batches (cs #35, 19 Nov 2026)

Plan only. Nothing here renders or writes the DB.

| File | What | Regenerates with |
|---|---|---|
| `azure-census.cjs` | read-only census: slots whose clip is Azure TTS in a role whose resolved cast is Cartesia | `set -a; . ~/ssi-restore/qa-copy.env; set +a; node ops/voice-casting/azure-to-cartesia/azure-census.cjs --out <census.json>` (QA copy; cast from Popty's resolved route) |
| `build-days.py` | census → `course-summary.json`, `day-plan.json`, `day1-batch.jsonl` (day lists live in its `DAYS`) | `python3 -I ops/voice-casting/azure-to-cartesia/build-days.py <census.json> ops/voice-casting/azure-to-cartesia` |
| `day1-batch.jsonl` | the exact day-1 asks: course, role, text, cast voiceId, chars, slots (with the pointer seen in the 19 Nov 03:30Z QA copy as `current`) | as above |
| `day1-dryrun-*.jsonl` | the 70 dry-run asks sent to `POST /api/audio/render` and what came back | not regenerated (one-off evidence) |

Days 2-4 are re-censused (same two commands) before Kai's Y/N for that day.
