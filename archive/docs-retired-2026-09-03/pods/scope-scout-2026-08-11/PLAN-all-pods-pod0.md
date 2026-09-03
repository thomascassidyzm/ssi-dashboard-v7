# Pod-0 across every language — state map and plan

**2026-08-11. Survey only. No writes, no audio, nothing triggered on popty.app.**

Four workers plus the parent read the live database and the two app repos. Every number below
came from a live query or a file, not from a doc. Where something could not be determined it is
marked **GAP**.

Supporting detail: [casting](https://watson-1.tail4968cb.ts.net/d/49049982) ·
[English clip reuse](https://watson-1.tail4968cb.ts.net/d/431f4ebf) ·
[structure & propagation](https://watson-1.tail4968cb.ts.net/d/98b8806b) ·
[translation state](https://watson-1.tail4968cb.ts.net/d/5add2f84)

---

## Read this first — two live problems

### 1. Welsh pod-0 is serving nothing, on two released courses

`cym_n_for_eng:pod-0` and `cym_s_for_eng:pod-0` hold **zero sentence rows**. The player asks for
exactly `` `${course}:pod-0` `` (`useListeningPods.ts:161`), hardcoded, no fallback. Both courses
are `status: released`. A learner opening Welsh listening pods today gets an empty scene list, and
has done for 5+ days.

The content is safe — it sits on the `-unrecorded` siblings, 232 rows, fully translated. It was
gated there deliberately on 2026-08-06, but the gating emptied the slug the app actually reads.

**This needs your ruling, not just a fix**, because the documented restore path is wrong: it would
repoint pod-0 at the old off-canon English, reintroducing the exact drift this exercise exists to
remove. **Recommendation: restore onto the new canon.** `cym_n` is the most finished pod in the
estate — 232 rows, fully translated, zero draft lines, human-cleared on 2026-08-10.

### 2. Two live pods are serving unproofread machine-drafted lines — 259 of them

**This is the draft-debt ledger. Both entries clear together, or neither does.**

| pod | course status | unproofread lines | of which already voiced | how it got live |
|---|---|---|---|---|
| `deu_at_for_eng:pod-0` | `draft` | **155** | 50 | aligned in place on the live slug, 2026-08-08 |
| `cym_s_for_eng:pod-0` | **`released`** | **104** | 0 | promoted during the 2026-08-11 outage fix |

*(Live counts, 2026-08-11. A third set — `spa_for_eng:pod-0-unrecorded`, 128 drafts, 45 voiced —
is NOT in this ledger because it sits on a gated slug no learner reads. It joins the moment
anything promotes it.)*

Both are the same defect class, and neither is contained by the flag: **nothing on the learner
path reads `target_text_draft`** — verified: zero references to that column anywhere in
`ssi-learning-app`, and it is absent from the player's fifteen-column select. A draft with audio
plays exactly like a finished line.

- **`deu_at`** is on the real learner slug (`pod-0`, not gated). The course is `status: draft`,
  which is what made in-place alignment legitimate; whether that is enough containment is your
  call.
- **`cym_s`** has no such cover: the course is **released**. It went live knowingly on 2026-08-11
  as the cheaper half of a trade — a served pod with 104 drafts beats the empty pod that had been
  serving nothing for five days on a released course — and Northern Welsh next to it has zero
  drafts because Aran proofread it. Full account and the one-command reversal:
  `docs/pods/welsh-pod0-restore-2026-08-11.md`.

**Both are blocked on the same ruling — call #7 below, proofreading policy, routed to Kai.**
When that lands, whoever clears the backlog clears *both* pods, and checks `spa` has not been
promoted in the meantime. The live query that regenerates this ledger from scratch:
`select pod_id, count(*) from listening_pod_sentences where target_text_draft group by pod_id`
— it is the only mechanism that cannot go stale, and it is what the Popty `/drafts` queue reads.

---

## 1. Inventory

**Canonical source of truth**: table `canonical_pod_scenarios` where `pod_slug = 'pod-0'` —
**231 rows, 22 scenes**, seeded from Aran's file via `docs/pods/pod0-english-canonical.md`. The
previous canon was 142 rows / 15 scenes, archived at `pod0-live-snapshot-2026-08-06.json`.

**Delta**: 140 lines carried over, **91 genuinely new** — the seven new Extra-phrases scenes 15-21
(79 lines) plus growth in scenes 2, 3, 9 and 12.

**73 pods exist across 67 courses. Four carry the new text:**

| pod | rows | translated | draft lines | note |
|---|---|---|---|---|
| `cym_n_for_eng:pod-0` | 231 | 231 | 0 | most finished in the estate; human-cleared |
| `cym_s_for_eng:pod-0` | 231 | 231 | 104 | **on the live slug** — drafts untouched, byte-identical |
| `spa_for_eng:pod-0-unrecorded` | 231 | 231 | 128 | cloned via the safe path; gated |
| `deu_at_for_eng:pod-0` | 231 | 231 | 155 | **on the live slug** |

Every other pod-0 is on the old 142. *(Updated 2026-08-11: the two Welsh pods moved off
`-unrecorded` onto the live slug in the outage fix, and all four rows now read 231 rather than
232 — the extra was a blank `SC15-S012` retired by the alignment and deleted on 2026-08-11 with
Tom's approval. See §5.)*

**How you can tell a pod is on the new text**: row count > 200 and ≥95% exact match of its English
side against `canonical_pod_scenarios`. English is `known_text` for `X_for_eng`, `target_text` for
`eng_for_X`, and absent entirely for seven courses.

### The finding that reshapes the plan: per-course English has drifted from canon

Courses match even the *old* canon on only **48-87%** of rows. This is real rewording, not
punctuation — `isl` reads "Good evening, Sara. Did you have a long day?" where `spa` reads
"Good evening, Sarah. Have you had a long day?". Across all `X_for_eng` courses: **~1,297 reworded
rows against only ~271 that look like legitimate localisation** (currency, language name — roughly
7 per course, against just 5 explicit `[target language]` placeholders in canon).

So "update pod-0 to the new text" is not a 91-line append for most courses. It is a 91-line append
**plus** overwriting 18-74 existing reworded lines per course.

---

## 2. English reuse

**English clips are shareable, and the estate is already doing it** — though not by design.
Identity is `(language, text, voice_id)`, but the DB unique key adds `course_code` and
`findExistingAudio` (`phase8:5799`) filters on it, so the *generator* cannot see another course's
clip. The *link* has no such constraint: the 16 `eng_for_*` pods share `target_audio_id` on 119/142
rows, and all 119 of those clips are owned by `zho_for_eng`.

Consequence of the generator blindness: 8,415 English clips matching a canonical line are only
**805 distinct identities**, stored as **8,292 separate S3 objects** — 10.3× duplication.

**The 231 lines:**

| | lines | clip exists somewhere | no clip anywhere |
|---|---|---|---|
| carried over | 135 | **135 (100%)** | 0 |
| genuinely new | 91 | 21 | **70** |
| `[target language]` placeholders | 5 | — | per-language, never shareable |

68 of the 70 gaps are in scenes 15-21. Scene 3's growth is entirely free.

**The 15× decision.** Standardise pod English on the two xAI clone voices already in wide use
(Olivia `xai_bedd6226` / Tom `xai_gfzdpspr5fdp`): **79 new English clips + 295 irreducible
per-language placeholder renders = 374 total.** Keep each course's current cast: **5,837 renders**
for identical coverage. This is a casting decision, not a pipeline problem.

**Nothing here has been generated. All of it is flagged generation-needed.**

Two incidentals: `deu_for_eng` and `fra_for_eng` pod-0 English is entirely mis-cast (210 clips all
voiced by `eve`, one female voice reading every character). And two canonical lines were reworded
em-dash → hyphen (global_order 73, 110), orphaning audio that exists under the old spelling —
cheapest fix is restoring the em-dash in canon. A probe over all 82 gap lines found exactly those
two, so that class is closed.

---

## 3. Translation state

**Source of truth confirmed**: `listening_pod_sentences.target_text`. No translation table exists —
eleven candidate names probed. `canonical_pod_scenarios` is English-only.

**All 91 new lines are translated on all four new-text pods. The other 69 pods have zero, and there
is no parked work anywhere to recover.**

Pipeline: canon → ledger pinned once (claude CLI, haiku) → scenes rendered independently (sonnet) →
upsert. Since 2026-08-07 the safe path is `align-pod0-to-canonical.cjs` (English/order only, leaves
target blank) + `write-pod0-drafts.cjs` (authored drafts through five text-only QC gates). `sync`
mode is the one that machine-translates, which is why the Welsh work bypassed it.

**Why `cym_n` has 0 drafts and `cym_s` has 104**: a human cleared the Northern queue on 2026-08-10
and has not opened the Southern one. Northern: 109 drafted → 18 actually reworded, 91 accepted
verbatim. Southern: 104 drafted, still byte-identical. Drafts were hand-authored per dialect from
its own corpus, not translated once and dialect-swapped.

**GAP: cost is unrecorded.** No tokens, spend or wall-clock was captured for any drafting run, so
the per-language price of the remaining 69 cannot be estimated from history.

The 5 `[target language]` lines resolve by plain substitution at write time — plain language name
on the English side ("Welsh", "Spanish", "German"), endonym on the target side (*Cymraeg*,
*español*, Austrian *Deitsch*). The 23 known≠English courses already carry their own resolutions.

---

## 4. Casting state

**The brief's premise does not hold.** Only **3 of 144 courses** have a `voice_config.podCast` at
all — `cym_n_for_eng`, `cym_s_for_eng`, and the test fixture. The Welsh bug was two records
disagreeing; that could only ever have existed on Welsh, and `f0a90a5f` fixed it. **There are no
cheap Welsh-style metadata fixes waiting anywhere.** For the other 67 pods `listening_pods.speakers`
*is* the casting, written by generation-side colouring, never chosen by a person.

Classes: agree/two/clean **4** (the Welsh pods) · Welsh-class mismatch **0** · agree-but->2 **0** ·
uncast **2** · no cast of record **67** (19 clean-two, 18 two-but-share-skewed, 30 multi-voice).

**The 30 multi-voice pods are one template, not 30 decisions.** The line-share signature repeats
identically across unrelated languages — `39/33/12/10/6` on eleven pods, `33/32/12/10/7/6` on five
— and 25 of 30 include the same house xAI voices. Every multi-voice pod is TTS; **no human cast in
the estate exceeds two voices.**

But the fix is not free: cutting each to two strands **41-71 already-rendered target clips per pod,
~1,400 across 29 courses**. That makes it an audio-generation approval, not a metadata edit — which
is why it is sequenced last.

`castFlags` lives at `src/views/admin/PodLab.vue:1355`; the survey re-implemented it verbatim rather
than inventing definitions.

**GAP**: `podCastVoices` — the field built to record "I meant 3-5 voices here" — is set on zero
courses, so deliberate-vs-never-looked-at cannot be read from the field designed to answer it. The
share-signature evidence is the substitute, and it says template. Nothing was listened to.

---

## 5. Propagation risk and tooling

**Aligning a live pod-0 directly, skipping the clone step, drops 16-30% of target-audio pointers and
20-41% of English-audio pointers per course** — measured read-only against four live courses.
Nothing is deleted, so make-before-break holds, but to a learner an unlinked clip is
indistinguishable from a broken one. **Clone-first is not optional.**

The align/clone/diff layer is already course-agnostic and audio-safe by construction. Three gaps set
the price of the remaining courses:

1. **No committed "swap the finished clone back in" tool.** Done by hand once — that is the Welsh
   outage.
2. **No known-language guard support** — blocks all 16 `eng_for_*` courses.
3. **No `status === 'released'` check in the aligner**, which is what let an in-place rewrite touch
   a released course.

*(1) is closed: `tools/pods/promote-pod.cjs` and `tools/pods/reslug-pod-rows.cjs` landed with the
2026-08-11 Welsh restore.*

**The retired-row residue, closed 2026-08-11.** When canonical scene 15 shrank from 12 lines to 11,
the aligner did not delete the surplus row: by design it blanks the text and parks the row at
`global_order 90000 + old` so no queue can reach it — `align-pod0-to-canonical.cjs:207`, whose own
comment reads *"NOT deleted — blanked… Deletion is a recommendation for Tom and Aran, never an
action here."* That is the estate's deletion gate working, not an off-by-one, so the tool is
**unchanged**. Tom made the call on 2026-08-11 and the four blank `SC15-S012` rows are gone
(`docs/pods/pod0-blank-sc15-s012-deletion-2026-08-11.md`). Any future canon shrink will park rows
the same way, and clearing them stays a deliberate, approved pass.

---

## 6. Proposed order of work — cheapest first

**Nothing below is started. Steps 3+ all require a generation approval.**

**0. Restore Welsh pod-0.** Live outage on two released courses. Needs your ruling on old-text vs
canon first (recommendation: canon). Data-only, no generation.

**1. Build the missing swap-back tool + the released-course guard.** Small, and it is the thing that
caused the outage. Everything after this depends on it.

**2. Decide the English casting question** (§2's 15× swing) and **the text-drift question** (§1).
Both are one-line rulings that change the cost of every remaining step. Free to decide, expensive
to defer.

**3. Generate the 79 + 295 English clips.** One approval, serves the whole estate. Only after step 2.

**4. Text-align the 57 courses still on 142**, clone-first, in tiers:
   - 16 `eng_for_*` — identical English, one shared text, blocked only on the known-language guard
   - 41 `X_for_eng` — per-course drift to overwrite
   - Each needs translation of the 91 new lines afterwards.

**5. The 7 no-English-side courses** (`spa_for_jpn`, `cat_for_spa`, `eus_for_spa`, `deu_for_jpn`,
`fra_for_jpn`, `ita_for_jpn`, `zho_for_jpn`) — see taste call 5.

**6. Casting normalisation** (~1,400 re-renders across 29 courses) — last, because it is the most
expensive and the least urgent.

**7. `fin_for_eng`** — cast it or leave it dark; independent of everything else.

---

## 7. Calls that are yours

1. **Welsh pod-0 restore: old text or canon?** (Recommendation: canon.) Blocking a live outage.
2. **The 1,297-row English drift.** Overwriting per-course English with canon flattens whatever
   localisation was deliberate; keeping it abandons a single shared English text and the clip reuse
   that comes with it. The biggest question in the survey.
3. **English pod casting: two shared clone voices, or per-course casts?** 374 renders vs 5,837.
4. **T-V register in the Extra-phrases scenes.** The four finished pods answer it three different
   ways, and Spanish is inconsistent within itself (tú at 6.9, usted at 10.8, tú at 22.1). The
   ledger pins register per-relationship, which is how you get three answers. Cheaper to rule now
   than after 69 courses are drafted.
5. **The seven no-English-side courses.** Translating them means writing the Japanese/Spanish
   *known* side afresh first — 445 lines of Japanese across five courses, at a politer register than
   `eng_for_jpn` uses — then translating the target from that.
6. **The six Narrator drill tails** (numbers, clock times, months). Spanish renders "2 o'clock" as
   *Las dos*; Austrian gives *Jänner*. Per-language each time, or one pinned inventory?
7. **Proofreading policy** — routed to Kai, unruled as of 2026-08-11. `pod-redo-scope-2026-08-07.md`
   records a "no-human-check ruling" that removes proofreading for the fleet, while the Welsh model
   is a named human clearing drafts one by one. Both cannot hold at 69 courses. **259 lines are
   already live behind this ruling: `deu_at` 155 and `cym_s` 104** — the draft-debt ledger at the
   top of this document, which is the list to work from when the ruling lands.
8. **Pointer reuse.** Repointing a pod at a correct-text, correct-language, correct-voice clip owned
   by another course is what the `eng_for_*` family already does, and it would convert ~4,044
   clip-slots from renders into pointer sets. It is not what your no-pointer-move rule was written
   against (wrong-length/wrong-language patching), but it is close enough to need your word.
9. **Multi-character casts**: `tha` has 31 characters, `ita_for_jpn` 24, `hrv:pod-1` 29. Cutting to
   two means one voice reading 13-15 characters. Also: xAI has zero female Italian and zero female
   Spanish locale voices (house `ara`/`eve` cover them today), and Welsh has no xAI pod voices at
   all though Azure `cy-GB-Aled`/`Nia` exist in the registry.

---

## Explicit gaps

- **Drafting cost is unrecorded** — no basis for pricing the remaining 69 languages.
- **`podCastVoices` is set nowhere**, so deliberate multi-voice casting cannot be distinguished from
  never-looked-at via the intended field.
- **Multi-sentence pause cues unquantified** — `generatePodAudio` rewrites multi-sentence turns as
  `"A … B"` and stores that as clip text; matching was done against canonical *line* text, so
  turn-level keying is unmeasured.
- **`text_normalized` holds two conventions** (trailing `?` kept pre-March-2026, stripped since); a
  reuse pass using `.eq()` will silently miss the older rows.
- **`psql` is not installed** on this machine — everything ran through supabase-js; a wider fuzzy
  sweep needs real SQL.
- **Nothing was listened to.** All audio judgements are from metadata.
