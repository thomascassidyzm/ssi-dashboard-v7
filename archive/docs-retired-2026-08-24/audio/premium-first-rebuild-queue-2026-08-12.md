# Premium-first non-English audio rebuild queue — 2026-08-12

ANALYSIS ONLY. No audio was rendered, no DB writes, nothing triggered on popty.app. Everything below
is read against the live DB (`courses`, `course_seeds`, `course_legos`, `course_practice_phrases`,
`listening_pod_sentences`, `listening_pods`, `course_audio`, `voices`) plus the learning app's actual
read path in `~/ssi-learning-app`. All queries are inlined so the numbers can be re-run and checked.

## 1. What "premium" actually means to a learner — the signal, confirmed against code

`courses.pricing_tier` defaults to `'premium'` on every row (`DEFAULT 'premium'::text`), so a
draft/hidden/never-shipped course inherits `'premium'` without that meaning anything — 53 of 144
courses are `premium/hidden/draft` and have never been reachable. `pricing_tier` alone is not a
ranking signal.

The real gate is in the app's own code, not a guess. `ssi-learning-app/api/courses/available.ts` —
the endpoint that populates the signup language pickers — is explicit in its own comment:

> "Returns the courses the app actually deploys to learners — mirroring the in-app catalogue query
> in App.vue (`new_app_status IN ('live','beta')`, ordered by `display_name`)."

```ts
.from('courses')
.select('course_code, target_lang, known_lang, pricing_tier, new_app_status, display_name, learner_display_name')
.in('new_app_status', ['live', 'beta'])
```

And the DB's own RLS `courses_select` policy confirms it from the other side — a course is visible to
anonymous/authenticated users when `visibility IN ('public','beta') OR new_app_status IN ('live','beta') OR enrolled OR admin`.
`status` (`draft`/`beta`/`released`) and `visibility` are editorial/staging fields that don't gate the
catalogue query at all — only `new_app_status` does.

**Rule adopted:** a course has real learner value only if `new_app_status IN ('live','beta')`
("reachable"). Within reachable courses, rank by `pricing_tier = 'premium'` first, `new_app_status =
'live'` before `'beta'`, then free-tier reachable, then unreachable (draft/not_available) last —
matching Tom's ruling verbatim. `visibility`/`status` are reported for context only, never used to
rank.

## 2. Rebuild unit = language, but courses ride on it

A voice is chosen once per target language and reused across every course teaching that language
(deu, fra, ita, kor, zho already do this via the multilingual xAI voices `ara`/`eve`/`leo`/`sal` — see
§4). So the queue is ordered by **target language**, aggregating all courses (any known_lang) that
teach it. 144 courses cover **66 distinct non-English target languages** (target_lang='eng' — the 21
reverse "eng_for_X" courses — is excluded per your ruling; that's a separate fresh build).

## 3. Volume methodology

For each target language, distinct non-English clips needed = the union of `target_text` across
`course_seeds`, `course_legos`, `course_practice_phrases` (joined to their course's `target_lang` via
`course_code`), and `listening_pod_sentences.target_text` (joined via `listening_pod_sentences.pod_id
→ listening_pods.id → listening_pods.course_code → courses.target_lang`), **deduped per language** by
normalising: lowercase, trim, strip the same punctuation set `course_audio.text_stripped` already uses
(`。？！、，.!?,;:()（）「」『』[]…—–¿¡-`). This is a text-level dedup, not a full-rebuild-cost estimate —
see the render-count correction below.

```sql
WITH norm AS (
  SELECT c.target_lang, lower(trim(regexp_replace(s.target_text, '[。？！、，.!?,;:()（）「」『』\[\]…—–¿¡\-]+', '', 'g'))) AS t
  FROM course_seeds s JOIN courses c ON c.course_code = s.course_code
  WHERE c.target_lang != 'eng' AND s.target_text IS NOT NULL AND s.target_text != ''
  UNION ALL  -- ...same shape for course_legos, course_practice_phrases...
  UNION ALL
  SELECT c.target_lang, lower(trim(regexp_replace(lps.target_text, '[...]+', '', 'g')))
  FROM listening_pod_sentences lps
  JOIN listening_pods lp ON lp.id = lps.pod_id
  JOIN courses c ON c.course_code = lp.course_code
  WHERE c.target_lang != 'eng'
)
SELECT target_lang, count(DISTINCT t) FROM norm GROUP BY target_lang ORDER BY 2 DESC;
```

`existing_clips` = `count(DISTINCT text_stripped)` from `course_audio` where `role IN
('target1','target2')`, joined to `courses.target_lang` (not `course_audio.language`, which is
inconsistent across engines — mixes `de`/`de-DE`/`deu` for the same language and would silently
undercount). **`existing_clips` is legacy-engine debris, not a rebuild credit** — a genuine
voice-swap rebuild (make-before-break, per this repo's own doctrine) regenerates every needed clip on
the new voice regardless of what already exists on the old one; the old clips get deleted only after
the new ones are verified. So the number to plan against is `needed`, not `needed − existing`.

Each distinct target text needs **two renders** (target1 + target2 — the course's two target-language
voices), confirmed against the DB: e.g. `deu_for_eng`'s xAI clip counts are target1 (`ara`+`xai_ara`) =
14,163 and target2 (`leo`+`xai_leo`) = 13,750 — a matched 1:1 pair, not a single shared render. Cost
and clip-count figures below are **`needed × 2`**.

## 4. Voice readiness — per language, from `courses.voice_config` and `voices`

`voices.provider_id` is empty on every row I found (a coordinator dead end noted for the record — do
not chase it further); the real engine/provider marker is `voices.tts_engine` and, per-course, `courses.voice_config->voices->target1->provider`.

**Finding that reframes "choose a voice per language":** the five languages that already carry an
xAI (new-engine) voice — deu, fra, ita, kor, zho — all use the **same** two multilingual xAI voice IDs,
`ara` (f) and `leo` (m) (fra additionally has `eve`/f in some courses; fin uses `sal`/m). `voices.languages`
for `ara`/`eve`/`leo`/`sal` is literally `{mul}` — one voice serves many languages, unlike Azure's
per-locale voices. So "is a voice chosen for language X" is really "has anyone pointed an xAI
`target1`/`target2` pair at a course in language X" — and today that's true for exactly 5 of 66
languages, all via the same `ara`/`leo` pair:

| lang | courses with xAI voice_config | actual xAI-voice clip counts today (from `course_audio`) |
|---|---|---|
| deu | `deu_for_eng` (ara/leo) | target1 14,163 + target2 13,750 — **already at near-full scale** |
| fra | `fra_for_eng` (eve/leo) | target1 15,101 + target2 14,605 — **already at near-full scale** |
| ita | `ita_for_eng` (ara/leo) | target1 ~1,017 + target2 900 — small pilot only; azure (`it-IT-Elsa/Benigno`) still carries ~12,800+ clips |
| kor | `kor_for_hin`, `kor_for_tam` (ara/leo) — **not** `kor_for_eng`, the flagship | target1 27,140 + target2 27,140 across those two courses — **fully rendered**, but on the wrong (non-flagship) course pair. `kor_for_eng` itself is still 100% Azure (`ko-KR-YuJin/GookMin`, ~12,400 clips) |
| zho | `zho_for_hin`, `zho_for_tam` (ara/leo) — **not** `zho_for_eng` | target1 22,445 + target2 22,445 — **fully rendered**, again on the non-flagship course. `zho_for_eng` is still ~100% Azure |

Genders check out against `voices.gender`: `ara`=f, `eve`=f, `leo`=m, `sal`=m, consistently used as
target1(f)/target2(m) — no transposition found in this set. (This is a course-level `voice_config`
check only, distinct from the pod-casting mechanism — `courses.voice_config.podCast` /
`app_config.pod_voice_pools` — which commits `25d9be73` and `f953fdf9` already surveyed and fixed;
Turkish's `tur.f[0]` mis-cast in `pod_voice_pools` was corrected there and is unrelated to `tur`'s
course-level `voice_config`, which is Azure-only and untouched by that fix. I did not re-audit
`pod_voice_pools` here — out of this brief's scope, flagged as a gap, not silently assumed clean.)

**Every other language — por, jpn, cym, ara, and all 41 free-tier + 24 draft languages — has zero xAI
voice on record.** `voice_config` is either Azure-only or (`{}`) entirely empty. These are **BLOCKED**:
Tom needs to pick (or approve reusing `ara`/`leo`/`eve`/`sal`, or a different pair) before any of
those languages can be queued for real.

## 5. fra and deu — pending #334 confirmation

Per your instruction, fra and deu are **excluded from the active queue below**, not silently dropped.
The DB evidence is consistent with "already substantially rebuilt on the new engine": both show
their xAI voice pair (`eve`/`leo` for fra, `ara`/`leo` for deu) carrying ~14,000–15,000 clips per
side — in the same order of magnitude as the `needed` volume computed in §3 (fra 34,024 distinct
texts × 2 = 68,048 renders needed; deu 46,057 × 2 = 92,114). That's a partial-to-substantial match,
not proof of completeness (I have not verified 1:1 text coverage, only aggregate counts), and I am
explicitly **not** the one confirming it — worker #334 is. Marked `PENDING #334` throughout.

## 6. Cost & wall-clock basis

- **Rate**: xAI TTS is $15.00 / 1M characters — `services/phases/phase8-audio-v13.cjs:5954`, citing
  `docs.x.ai/docs/pricing`, checked in-repo 2026-07-28 (the file's own comment notes an earlier
  $4.20/1M figure was press-coverage, not the billed rate, and under-estimated cost 3.6x — using the
  current $15.00 figure here).
- **Avg clip length**: 22 characters (stddev 17) — measured directly across all 795,625 target-text
  rows in the §3 union, not assumed.
- **Concurrency ceiling**: 4 concurrent xAI renders is a documented throughput fact, not a tuning
  knob (`docs/architecture/AUDIO_PIPELINE_PROVIDERS_FIDELITY_LABS-2026-08-06.md`).
- **Empirical throughput**: `deu_for_eng`'s real `course_audio.created_at` timestamps show a genuine
  burst of **5,218 clips in one hour** (2026-07-11 18:00 UTC) — that's the peak/best-case rate at
  concurrency 4. Its full 7-month history otherwise averages far lower (~2.6/hr) because most of that
  window was idle between batch runs, not continuous rendering — so I give a **peak** (5,218/hr,
  continuous best case) and a **conservative** (2,500/hr, allowing for the documented stub-rate
  cooldown and phonology re-rolls) wall-clock range rather than one number.

## 7. THE QUEUE

Ordered per your ruling: premium+live → premium+beta → free/public → drafts. Within a tier, ordered
by `needed` volume (larger course investment = more learner value unlocked per rebuild). Cost/hours
use `needed × 2` (two target voices).

### Tier 1 — premium + live (highest value, all reachable today)

| # | lang | courses (tier/status) | needed (distinct) | ×2 renders | existing clips (legacy) | voice status | cost | hrs (peak/conservative) |
|---|---|---|---:|---:|---:|---|---:|---|
| 1 | **spa** | spa_for_eng(premium/live), spa_for_jpn(premium/beta), spa_for_zho(premium/beta), spa_mx_for_eng(premium/beta), +3 draft variants | 34,949 | 69,898 | 36,848 | **BLOCKED** — no xAI voice anywhere | $23.07 | 13.4h / 28.0h |
| 2 | **kor** | kor_for_eng(premium/live), kor_for_hin(premium/beta), kor_for_tam(premium/beta), +3 draft | 34,826 | 69,652 | 35,287 | **READY** — ara/leo proven at 27,140-clip scale, but on kor_for_hin/tam, not the flagship kor_for_eng | $22.99 | 13.4h / 27.9h |
| 3 | **zho** | zho_for_eng(premium/live), zho_for_gle/hin/jpn/tam(premium/beta), +1 draft | 32,558 | 65,116 | 33,269 | **READY** — ara/leo proven at 22,445-clip scale, on zho_for_hin/tam, not the flagship zho_for_eng | $21.49 | 12.5h / 26.1h |
| 4 | **por** | por_for_eng(premium/live), por_br_for_eng(premium/beta), +7 draft (br/jpn/zho/cym/lit/aze variants) | 28,383 | 56,766 | 25,713 | **BLOCKED** — no xAI voice anywhere | $18.73 | 10.9h / 22.7h |
| 5 | **ita** | ita_for_eng(premium/live), ita_for_jpn/zho(premium/beta), +1 draft | 21,413 | 42,826 | 22,592 | **READY** — xAI pilot exists on the flagship course itself (~1,017/900 clips), azure still dominant | $14.13 | 8.2h / 17.1h |
| 6 | **cym** | cym_n_for_eng, cym_s_for_eng (both premium/live), +2 (anthem/free, cor_for_yor draft) | 12,150 | 24,300 | 12,142 | **BLOCKED** — no xAI voice anywhere | $8.02 | 4.7h / 9.7h |
| 7 | **jpn** | jpn_for_eng(premium/live), +2 draft (cym/zho) | 10,714 | 21,428 | 11,090 | **BLOCKED** — no xAI voice anywhere | $7.07 | 4.1h / 8.6h |

### Tier 2 — premium + beta (not yet live)

| # | lang | courses | needed | ×2 renders | existing | voice status | cost | hrs |
|---|---|---|---:|---:|---:|---|---:|---|
| 8 | **ara** | ara_eg/lb_for_eng(premium/beta), ara_for_eng(premium/beta), +7 draft variants | 35,306 | 70,612 | 24,936 | **BLOCKED** — no xAI voice anywhere | $23.30 | 13.5h / 28.2h |
| — | ~~deu~~ | 8 courses, deu_for_eng(premium/beta) flagship | 46,057 | 92,114 | 34,568 | xAI ara/leo at ~14k-clip scale | $30.40 | 17.7h / 36.9h | **EXCLUDED — PENDING #334 CONFIRMATION** |
| — | ~~fra~~ | 5 courses, fra_for_eng(premium/beta) flagship | 34,024 | 68,048 | 35,027 | xAI eve/leo at ~15k-clip scale | $22.46 | 13.0h / 27.2h | **EXCLUDED — PENDING #334 CONFIRMATION** |

### Tier 3 — free + reachable (public/beta, `pricing_tier='free'`) — positions 9–49, all BLOCKED on voice

Every one of these 41 languages has **zero xAI voice on record** — Azure-only. Sorted by `needed`
(×2 renders and cost follow the same $15/1M-char, 22-char-avg basis as above; omitted per-row for
brevity, all in the $1.50–$3.75 / 0.9–2.2h(peak) range):

| # | lang | needed | # | lang | needed | # | lang | needed |
|---|---|---:|---|---|---:|---|---|---:|
| 9 | eus | 11,296 | 23 | pol | 6,221 | 37 | tha | 5,147 |
| 10 | cat | 10,796 | 24 | ron | 6,181 | 38 | nor | 5,131 |
| 11 | tur | 9,495 | 25 | hye | 5,953 | 39 | nld | 4,812 |
| 12 | ell | 8,161 | 26 | srp | 5,906 | 40 | afr | 4,642 |
| 13 | nep | 7,383 | 27 | heb | 5,867 | | | |
| 14 | fas | 7,267 | 28 | hun | 5,820 | | | |
| 15 | hrv | 6,725 | 29 | lav | 5,772 | | | |
| 16 | rus | 6,617 | 30 | swe | 5,731 | | | |
| 17 | ben | 6,586 | 31 | isl | 5,659 | | | |
| 18 | swa | 6,524 | 32 | est | 5,650 | | | |
| 19 | lit | 6,447 | 33 | ukr | 5,648 | | | |
| 20 | gle | 6,380 | 34 | glg | 5,388 | | | |
| 21 | hin | 6,334 | 35 | dan | 5,360 | | | |
| 22 | ces | 6,279 | 36 | bul | 5,312 | | | |

Full per-language course lists, existing-clip counts and exact costs for this tier are in the raw
query output (`/tmp/final_table.txt` on this machine) — happy to expand any row on request rather than
padding this doc with 41 near-identical rows.

### Tier 4 — draft / not reachable (`new_app_status='not_available'`) — last, no current learner value

24 languages (hak, fin, tel, mar, yue, pdc, bre, nan, mlt, gla, fur, cor, rgn, scn, roh, nap, lmo,
kan, mkd, vec, yid, yor, sme, ind). Volumes range 20,464 (hak) down to 666 (ind) — several are
skeleton/near-empty courses (0 seed_count, ~667 rows = template boilerplate only). None are served by
`available.ts` today, so a rebuild here produces zero learner-visible change until someone also flips
`new_app_status`. Genuinely last per your ruling.

## 8. Reading position 1 / positions 1–3

- **Approving position 1 (spa) alone** commits to: choosing an xAI voice pair for Spanish (none exists
  yet — `ara`/`leo` reuse is available and gender-correct, or a fresh pair), then ~$23 and 13–28 wall
  hours of xAI rendering for 69,898 clips.
- **Approving 1–3 (spa, kor, zho)** commits to: one Spanish voice decision (new) + reusing the
  existing `ara`/`leo` pair for kor and zho (already proven at scale, just needs pointing at the
  flagship `kor_for_eng`/`zho_for_eng` courses instead of the hin/tam variants) — combined ~$68 and
  ~38–82 wall hours if run sequentially at conservative throughput, less if courses render in
  parallel (still capped at 4 concurrent xAI calls total, so parallel courses share, not add to, that
  ceiling).
- Positions 2 (kor) and 3 (zho) are **cheaper to unblock than position 1 (spa)** — no new voice
  decision needed, just redirecting an already-proven voice pair to the flagship course. Worth
  flagging as a sequencing option even though it breaks strict volume order within the tier.

## 9. Gaps — reported, not papered over

- I did not verify **1:1 text-level coverage** for fra/deu's existing xAI clips against the §3 needed
  set — only aggregate clip counts. Confirming completeness is worker #334's job, not mine.
- Tier 3's 41 free-language rows are summarised (lang + needed only) rather than fully tabled with
  cost/hours/existing-clips columns, to keep this doc a single readable table set — the same query
  pattern in §3/§6 produces them on request.
- `voices.provider_id` is empty on every row inspected — a dead field for this analysis; flagged for
  whoever owns that table, not chased further here.
- I did not re-audit `app_config.pod_voice_pools` gender casting beyond citing the two prior commits
  that already covered it (25d9be73, f953fdf9) — that's a different casting mechanism from
  `courses.voice_config.target1/target2` and wasn't in this brief's scope.
- "Peak" throughput (5,218 clips/hr) is a single observed hour, not a sustained-rate guarantee —
  treat any position-1 run as a shakedown, not a scheduling promise.
