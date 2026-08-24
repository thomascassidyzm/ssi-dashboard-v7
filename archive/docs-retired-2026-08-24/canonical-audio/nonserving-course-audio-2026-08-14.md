# The 1,379 "unfetchable" course_audio rows — 50 were broken, not 1,379

**2026-08-14. Live database. Every claim below rests on bytes fetched the way a learner fetches them.**

Approved as "fix 1,379 `course_audio` rows that point at objects a learner cannot fetch —
1,303 `repair-candidates/`, 26 `mastered-v2/`, 50 `pending/`", handed over by
[`canon-reselect-2026-08-14.md`](./canon-reselect-2026-08-14.md).

The first thing this pass did was re-measure the premise. It did not hold.
**1,329 of the 1,379 are audible to learners right now. 50 are not.**

## Why the count was wrong: the wrong measurement layer

The 403s in the canon report are real. They are also not what a learner sees, because
**no learner playback path uses the anonymous public URL.** Both read paths use server
credentials:

| Path | File | How it reads S3 |
|---|---|---|
| `/api/audio/:id` | `ssi-learning-app/api/audio/[audioId].ts` | `GetObjectCommand` with service credentials |
| `/api/audio/batch-urls` | `ssi-learning-app/api/audio/batch-urls.ts` | `getSignedUrl(...)` — presigned, 300s TTL |

`AUDIO_CONFIG.s3BaseUrl` in `player-vue` looks like a direct-to-S3 fallback, but
**it has no consumer** — `grep -rn "s3BaseUrl" packages/` returns only its own definition.

So an anonymous 403 says *this bucket prefix is private*. It says nothing about audibility.
Measured three ways across all 1,379 rows (`scripts/probe-broken-rows.cjs`):

| Prefix | Rows | Anon public | Object exists? | Presigned GET | Learner hears |
|---|---|---|---|---|---|
| `repair-candidates/` | 1,303 | 403 | **yes** | **200** | **yes** |
| `mastered-v2/` | 26 | 403 | **yes** | **200** | **yes** |
| `pending/` | 50 | 403 | **no** | — | **silence** |

Control, 15 healthy `mastered/` rows: anon **200**, presigned **200**. `mastered/` is the one
anonymously-public prefix — which is exactly why a public-URL probe scored every other prefix
as dead.

**Only the 50 `pending/` rows are a learner-facing defect.** Their objects were never written —
several do not even carry a `.mp3` extension (`pending/705F0F4B-BB12-4B99-8FB7-A3B499E264D3`).
They are unfinished renders, not damaged ones.

## What was repaired

Reachability was checked against every table that can point at a clip (`course_legos`,
`course_practice_phrases`, `course_seeds`, `lego_introductions`): **27 of the 50 are reachable
from live content**; the other 23 are unreferenced rows.

| | Rows |
|---|---|
| **Repointed onto a verified serving take** | **4** |
| **Queued for re-render — nothing fetchable exists anywhere** | **46** |
| Unresolvable | 0 |

### The 4 repoints

Each had a take of the *same canonical identity* (text_key, language, role, voice) alive on
`mastered/`, found with the backfill's own ladder — human, veracity-passed, measured, oldest.

| Course | Role | Text | Replacement from |
|---|---|---|---|
| `por_for_eng` | known | "are you ready to go home" | `zho_for_eng` |
| `spa_mx_for_eng` | known | "so what's your name" | `fra_ca_for_eng` |
| `spa_mx_for_eng` | known | "you don't mind" | `ita_for_eng` |
| `zho_for_jpn` | known | 必要 | `fra_for_jpn` |

Make-before-break, in this order: all 4 replacements fetched and confirmed real MP3s **before**
any write; each write logged to `audio_convergence_log` (pass `repair-nonserving-2026-08-14`,
bucket `pending_object_missing`) with the superseded key; the `UPDATE` asserts the old key in
its `WHERE` clause and aborts on drift; then all 4 re-fetched. **4/4 PASS, SHA-256 identical
before and after.** No S3 object was deleted or overwritten.

A first apply attempt failed on all 4 (`course_audio` has no `updated_at` column). Every
transaction rolled back whole — `audio_convergence_log` held 0 rows afterwards, confirming the
log-then-swap gate does what it claims.

### The 46 queued

Nothing was fabricated for these. Queued through the normal `audio_pass_requests` path
(`queueAudioPass`), which phase8 `/generate` fulfils — no TTS was run.

| Course | Rows | Learner-reachable |
|---|---|---|
| `spa_mx_for_eng` | 17 | 13 |
| `deu_at_for_eng` | 13 | 6 |
| `deu_for_eng` | 12 | 0 |
| `por_for_eng` | 4 | 4 |

All four are TTS courses; none is human-voice, so no recordist worklist is involved.

## Reconciliation

`course_audio` prefixes, before → after: `pending/` **50 → 46**, `mastered/` **2,563,230 →
2,563,234**. `repair-candidates/` (1,303) and `mastered-v2/` (26) **bit-identical, untouched**.
`audio_convergence_log` holds exactly 4 rows for this pass. The delta equals the log exactly.

## The decision this leaves you

**The 1,329 audible rows on `repair-candidates/` and `mastered-v2/` are not broken — but they
are outside the serving convention**, which has one real cost: the canon backfill stages
`mastered/` only, so these lines can never become canonical or be reused by another course.

All 1,303 `repair-candidates/` rows are `status='accepted'` in `audio_repair_candidates` —
**292 decided by you personally**, the rest by `overnight-qc-campaign` / `claude`.

Two ways to close it, and they are not equivalent:

- **Repoint them to canon** (334 have a serving alternative). Cheap, but it swaps 43 of *your*
  accepted takes for a different recording — that is overwriting a human decision, which the
  human-outranks-canon doctrine forbids.
- **Promote the accepted bytes to `mastered/`** — S3 copy, no deletion, ~33MB, no TTS spend.
  Honours the acceptances, brings all 1,329 onto the serving convention, makes them
  canon-eligible.

**My recommendation: promote.** It is the only option that respects the acceptances, and it is
reversible. The one thing worth your sentence: `mastered/` is anonymously public, and 1,011 of
those acceptances were machine decisions, not yours — promoting makes machine-accepted repairs
canon-eligible estate-wide. Say go and it runs the same make-before-break way.

## Files

- `tools/repair-nonserving-course-audio.cjs` — the gated repair (dry-run default)
- `docs/canonical-audio/nonserving-course-audio-{dryrun,applied}-log.json` — per-row logs
- `scripts/probe-broken-rows.cjs` — the three-layer probe (read-only)
