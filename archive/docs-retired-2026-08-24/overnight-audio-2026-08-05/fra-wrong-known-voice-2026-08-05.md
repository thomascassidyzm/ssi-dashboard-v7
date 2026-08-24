# fra_for_eng — English prompts were being read by the French voices

**2026-08-05 · worker `ae401eb8` · French only (German is held by sibling `f4f12360` under
`/tmp/popty-overnight-audio.lock`; French was ceded to me and claimed at 02:48:46Z)**

---

## The finding

This is the **same bug Kai heard in German on 2026-08-04**, still live in French and never swept.

`docs/audio-repair-2026-08-04/deu_for_eng-revoice-complete.md` records the cause: the pod builder
took the **known-side** voice from whichever character voice the *target* line used, instead of from
`voice_config`. In German that put 80 English `known` clips into a German voice. It was fixed there.
Nobody ran the equivalent pass on French.

`fra_for_eng` `voice_config` (live, unchanged since 2026-01-23): known=`eve`/en, target1=`eve`/fr,
target2=`leo`/fr, presentation=`eve`/en — all xAI.

Measured live, roles whose voice **must** be the configured one:

| role | voice found | clips | what a learner heard |
|---|---|---:|---|
| `known` | `leo` (the French target2 voice) | 115 | English prompt read by the French male voice |
| `known` | `bedd6226` (pod character) | 17 | English prompt read by a French character voice |
| `known` | `gfzdpspr5fdp` (pod character) | 5 | as above |
| `known` | `f15c6a6a` (pod character) | 1 | as above |
| `presentation` | `xai_gfzdpspr5fdp` | 10 | lego introduction in a character voice, not `eve` |
| `bookend_listen_intro` / `_outro` | `azure_en-GB-SoniaNeural` | 2 | legacy Azure voice mid-course |
| **total** | | **150** | |

Reachability was checked before spending anything — these are not orphans: 68 are linked from
`listening_pod_sentences.known_audio_id`, 69 from `sentence_known_audio_ids`, 7 from
`course_practice_phrases.known_audio_id`, 3 from `course_legos.known_audio_id`. Learners hit them.

Sample texts, verbatim from the live table, all `role='known'` and all in the French `leo` voice:

> "Of course. What are your symptoms?" · "Would you like still or sparkling water to start?" ·
> "At the second roundabout, take the first exit." · "I'm James. Pleased to meet you."

## What was NOT touched, deliberately

**Pod TARGET voices are deliberate multi-speaker casting, not a defect.** French carries `target1`
on `ara` (122), `0p0rt7o1` (56), `69smp8rm` (21), `hbxkrnwm` (9) and `pod_take_g` across five
voices. Re-voicing those would collapse a cast dialogue into one speaker and destroy the pod —
the German document says so explicitly and it applies unchanged here. A blanket
"voice_id ≠ configured voice" sweep would have done exactly that damage, which is why the
selection policy lives in a visible query (`scripts/overnight-fra/wrong-known-voice.cjs`) and not
inside the tool.

`instruction` (48), `encouragement` (26) and `welcome` (1) are `origin='human'` and are never
re-synthesised.

## Why the existing tool could not see this

`tools/revoice-clips.cjs` is the right tool — it takes the target voice from the COURSE rather than
from the row, and it inserts before deleting, which is what makes `presentation` safe to move there
and unsafe to repair in `repair-silent-clips.cjs`. But its selector, `isLegacyVoice()`, only
recognises a legacy **provider** (`azure_`/`elevenlabs_`/`…Neural`). A course's own xAI voice on the
wrong side is invisible to it. A `--dry` run on French proposed **2** clips. The real number is 150.

Three commits close that:

- `3d578580` — `--ids <path>`, so an explicitly-selected list can be carried in, with the policy
  staying in the caller's query. Everything downstream is unchanged: human/stub refusal, twin merge,
  the runtime-calibrated truncation gate.
- `9b767581` — the per-clip re-read guard asked `isLegacyVoice()` too, so the first pilot skipped
  all 10 clips as "already on leo" while they sat on exactly the wrong voice. Under `--ids` it now
  asks whether the clip is already on the configured voice for its slot.
- `92ae5595` — the first full run then **refused 65 of 140** because they were referenced from
  `listening_pod_sentences`' unconstrained ARRAY columns, and refusing them meant leaving English
  pod lines in the French male voice, i.e. refusing exactly the job. The tool now swaps those slots
  **positionally** — never appended, never deduped, re-read and asserted against the expected old id
  before writing, and all array writes serialised through one chain because several clips share a
  pod row. The German document of 2026-08-04 had already ruled that these need re-linking rather
  than refusal; the code had not caught up.

## The plan, as run

| | |
|---|---|
| course | `fra_for_eng` only |
| selection | `scripts/overnight-fra/fra-wrong-known-voice.json` — 150 ids, built by the query above |
| clips | 150 (142 render, 8 merge into an existing `eve` clip at no TTS cost) |
| characters | 5,902 total text; ~5,721 actually re-rendered |
| voices | destination is the course's own `voice_config`: `known`/`presentation`/bookends → `eve` |
| guards | `TAIL_REPAIR_MODE=flag` and `PHASE8_NO_LISTEN=1` exported and asserted before every run |

Guards are not ceremony: on this branch `services/audio-processor.cjs:684` still defaults to
`repair`, so a tool launched from a plain shell amputates its own fresh renders. (`origin/main` has
flipped the default to `flag` in `4c5bbf90`; this branch predates it.)

Shakedown first: 10 clips, verified, before the remaining 140.

## Result

Pilot (10 clips): **7 re-voiced, 3 merged, 0 failed**, 282 characters, xAI 7 responses / 0 empty /
0 cooldowns.

The flag branch was proven again on live renders during the pilot — six occurrences of:

```
[Phase8-Audio-v13] masterAudio: tail flag (rise -10dB at 1.974s) is resumed speech
                                — pausey render shipped untouched
```

That is the fix working on real spend: the tail detector fired and the clip shipped **untouched**
instead of being cut.

**Complete, 03:03Z: 150 of 150 — 142 re-voiced, 8 merged, 0 failed.** 5,721 characters of TTS
across four runs (10 pilot · 140 · 3 array pilot · 62 array remainder). xAI health across all of
them: 142 responses, 0 empty, 0 cooldowns.

Verified after the fact, live:

| check | result |
|---|---|
| any `known`/`presentation`/bookend clip still off the configured voice | **0** — the selection query now returns an empty set |
| dangling pod array slots | 118, **unchanged** from before the run — nothing was stranded |
| `listening_pod_sentences` with a `known_audio_id` | 68, **unchanged** — no link was nulled |

Course version bumped on each run; the revalidation key moved `2315 → 2319`, so clients refetch
rather than 404 on ids that no longer exist.

## The French opening stretch is structurally complete

Free checks the acoustic gate does not perform, seeds 1–30:

| check | result |
|---|---|
| missing audio | 1,092 phrases; 0 missing `known`, 0 missing `target1`, 1 missing `target2` — and that one is `fra_for_eng:S0009L02C01`, a `phrase_role='component'` row, which the runtime skips |
| lego introductions | 94 legos, **94** with a `lego_introductions` row, **94** with real presentation audio, 0 null durations |

## Gaps — stated, not papered over

- **The gate is validated on SILENCE and TRUNCATION. Mispronunciation is NOT covered and was never
  tested.** No pass rate in this document may travel without that sentence.
- **`pod_explainer` carries 169 clips under the ms/char < 40 truncation-suspect threshold and no
  tool can repair them** — every repair tool refuses `pod_*` by design, and pods bypass the
  pre-publish veracity gate entirely (`services/pod-explainer-composite.cjs:302`, per
  `docs/introductions-audio-coverage-2026-08-05.md`). Reported, not actioned: closing it is a build,
  not a sweep.
- **`presentation` shows 0 clips under that threshold** in French (2,173 clips). That is a good
  sign, not a clearance — the predictor has high precision and poor recall, so "0 suspect" is not
  "0 damaged". Only an acoustic pass would answer it.
- Whether a French character voice reading an English pod line was ever *intended* casting is a
  taste call I did not make: I applied the German ruling, which was that the known side is the
  narrator's and the target side is the cast's. If Tom disagrees, the 150 old ids are in
  `scripts/overnight-fra/fra-wrong-known-voice-detail.json`.

---

## Second finding: 118 French pod slots point at audio that no longer exists

Found while verifying that tonight's array swaps had not stranded anything. They had not — **0 of
the dangling entries below is attributable to any run tonight**, checked by intersecting the live
dangling set against every id my three runs touched. These are pre-existing.

`listening_pod_sentences` carries three uuid ARRAY columns with **no foreign key**, so a delete
anywhere else in the estate strands the uuid silently — no error, no cascade, no null.

| column | fra_for_eng dangling slots | rows affected | deu_for_eng |
|---|---:|---:|---:|
| `sentence_known_audio_ids` | 104 | 47 | 42 |
| `sentence_audio_ids` | 14 | 13 | 38 |
| `takeg_audio_ids` | 0 | 0 | — |
| **total** | **118** | | **80** |

**These are learner-facing.** `packages/player-vue/src/composables/podSentenceSplit.ts` reads both
arrays directly — "the UNIT the learner hears" — and `usePodLapScheduler.ts` schedules from them.
A slot holding a dead uuid is a sentence the pod cannot play.

**Not fixed tonight, and not because it is hard to decide — because it is a build.** Healing one of
these means *rendering a clip that does not exist* and inserting it at an exact array index. Every
existing tool starts from a live row: `revoice-clips.cjs` moves one, `repair-silent-clips.cjs`
re-renders one. Neither can mint the missing one. And `pod_*` roles are refused by every repair tool
by design. So this is a new small tool, not a flag, and it belongs to a morning with Tom awake
rather than to a night of unattended spend.

**Recommendation, one line:** *build a pod-slot backfill that re-renders the missing per-sentence
clips from the pod's own text and swaps them into the dangling slots — 118 French, 80 German.*

Also noted, unexplained: 74 of the 142 French pod sentences have `known_audio_id IS NULL` while all
142 have `target_audio_id`. Whether that is by design (a turn with no known-side narration) or a
third gap, I did not establish. Stated as a gap.
