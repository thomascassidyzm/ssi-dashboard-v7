# Listening pods across SSi — the stock-take, measured

Measured 2026-09-08, read-only, against the live Supabase project and against what the
learner app actually serves. Nothing here was changed, generated, migrated or fixed.

Two instruments were used and they are named at every claim:
- **DB** — direct SQL against the production database (`.env.psql`).
- **SERVED** — the same queries the player makes, run **anonymously through RLS** with the
  app's own publishable key, so the answer is the payload a learner's browser gets, not a
  code read. Where I only had the code, I say so.

---

## The one-paragraph answer

There are **130 pod rows across 67 courses and 24,782 pod sentences** in the database, but a
learner can only ever reach **64 of them** — the resolver serves `pod-1` or `pod-0` and
nothing else. Every one of those 64 is a **per-course** object: the target text was minted
separately for each language pair, and where two courses share a target language it has
already **drifted apart**. Catalan is the clean specimen — `cat_for_eng` and `cat_for_spa`
are the same language, same dialect, same slug, and **90 of their 142 sentences differ**.
The one place the estate already behaves the way Tom describes is the **audio**: 16 English
courses share **187 clips** across 2,272 sentence rows, because clip identity is
`text | language | voice` and the text happened to be identical. So the estate keys pod
**audio** per language and pod **text** per pair, and the pair keying is the thing that has
drifted.

---

## 1. What the objects are, and which of Tom's two boxes each falls in

| Artefact | Table / file | Language baked in? | Shape |
|---|---|---|---|
| The shape metagraph | `services/shared/metagraph/*.json` (files, on `main`) | **No** | Language-free. 30 nodes, 6 bound pairs, 27 moves, 24 composition edges, 4 survivability edges, 9 outcome shapes, 5 walk-set files. Its own header says "nothing in these files carries a `lang_pair` or a target language." |
| Walk steps | `canonical_pod_walk_steps` (DB) | **No** | 709 steps over 8 pod slugs — node references, not sentences. |
| Canonical scenarios | `canonical_pod_scenarios` (DB) | **Mixed — this is the third shape** | 3,969 rows, 12 slugs. 2,451 rows are English-only (language-free). **1,518 rows carry `target_text` + `target_lang` already**, and four of the twelve slugs are *named after a course* (`cym_n_for_eng:health`, `cym_s_for_eng:health`, plus `method-pod-*` in Italian). The canonical layer is not uniformly canonical. |
| Course pods | `listening_pods` (DB) | **Yes** | Keyed on `course_code`, unique on `(course_code, slug)`. There is no language column anywhere in the table. |
| Pod sentences | `listening_pod_sentences` (DB) | **Yes** | 24,782 rows, keyed to a pod, so keyed to a course. |
| Pod clips | `course_audio` (DB) | **Per language** | Clip identity is `normalised_text | canonicalLanguage | voice_id` (`services/shared/clone-copy-match.cjs:70`). Region is stripped before identity — `fr-CA` and `fr` are one language here. |

**The third shape, named plainly:** a *canonical scenario row that already has a target
language in it*. It is neither a language-free walk nor a course pod. 1,518 of 3,969
canonical rows are in that state.

---

## 2. How a pod is actually produced

`services/pod-dialogue-generator.cjs` is the whole hinge, and it runs **once per course**:

1. Loads the course's `known_lang` / `target_lang` from `courses`.
2. Loads the English canonical slate — `canonical_pod_scenarios` where
   `pod_slug = 'pod-1'` (a constant in the file, `CANONICAL_LIVE_SLUG`).
3. For each scene, calls the Claude CLI (`claudeChat`, model `sonnet` by default) with
   `services/pod-generation-prompt.txt` plus culture notes, asking it to *flex* the English
   into that pair. It validates line count and retries once.
4. Writes `listening_pods` + `listening_pod_sentences` with `target_text_draft` set, then
   casting/rendering happens downstream (`services/voice-engine/pods-*`, `phase8-audio-v13`).

Two consequences fall straight out of that and both are measured below: the target text is
an **independent LLM generation per course**, and the metagraph is **not on this path** —
`pod-dialogue-generator.cjs` does not require `services/shared/metagraph/index.cjs`. The
only consumers of the metagraph store are `services/production-api.cjs`, the admin SPA
(`src/views/MetagraphView.vue`, `src/lib/metagraph/*`), and tools under `tools/metagraph/`
and `tools/pods/`. It informs the dashboard; it does not mint a pod.

---

## 3. The keying question — the load-bearing measurement

`listening_pods` has `course_code`, a unique constraint on `(course_code, slug)`, and no
language column. **Pod content is keyed per lang_pair today.** Here is what that costs,
measured slot by slot across every language served by more than one course:

| Target language | Slug | Courses | Slots | Target text **identical** | Target text **diverged** |
|---|---|---:|---:|---:|---:|
| eng | pod-0 | 16 | 142 | **142** | 0 |
| spa | pod-1 | 2 | 231 | 124 | **107** |
| cat | pod-0 | 2 | 142 | 52 | **90** |
| por | pod-1 | 2 | 231 | 35 | **196** |
| fra | pod-1 | 2 | 231 | 33 | **198** |
| ara | pod-1 | 2 | 231 | 25 | **206** |

Four of those five divergent rows are dialect pairs (`spa`/`spa_mx`, `por`/`por_br`,
`fra`/`fra_ca`, `ara`/`ara_eg`), where difference is arguably the point — although the
`courses.dialect` column reads `standard` for **every one of them**, so nothing in the data
says the divergence is deliberate.

**Catalan is the case with no such defence.** `cat_for_eng` and `cat_for_spa` are the same
target language, the same `dialect = standard`, the same `pod-0` slug, and 90 of 142
sentences differ. From the served payload, slot 6:

```
cat_for_eng  →  No, és lliure. Si us plau, endavant.
cat_for_spa  →  No, està lliure. Si us plau, endavant.
```

and slot 7:

```
cat_for_eng  →  Bona tarda. Què vols?
cat_for_spa  →  Bona tarda. Què et puc oferir?
```

Two learners of Catalan hear two different Catalan courses because the generator ran twice.

**And here is the counter-case, which is the important one.** The 16 `eng_for_*` courses
share one target language and their pod-0 target text is **identical in all 142 slots**.
Because clip identity is keyed on text + language + voice, those 2,272 sentence rows point
at only **187 distinct audio clips**. The audio layer already de-duplicates per language,
automatically, with no per-language table. Where the text diverged the sharing vanished:
`cat` 284 rows → 284 distinct clips, `fra` 462 → 462, `por` 462 → 462, `ara` 462 → 462.

Read together: **per-language keying already works in this estate wherever the text
happens to be identical. Nothing enforces the text being identical.**

---

## 4. What the learning app actually plays, and where it unlocks

The player reads Supabase directly; there is no pod API route.
`packages/player-vue/src/composables/servedPod.ts` is the only place the slug is decided:

- `SERVING_POD_SLUGS = ['pod-1', 'pod-0']`, `pod-1` preferred. **Hard gate, not a default.**
- Anything else — no rows, an error, a parked slug — resolves to `pod-0`, whose sentence
  query then returns nothing. Unavailable reads as "no pods yet", never as an error.
- Content is held back by **parking** it on a non-serving slug (`pod-0-unrecorded`,
  `pod-0-retired-2026-08-22`, …) or by `visibility = 'held'`, which RLS enforces.
- One exception: a pod with a `required_role` outranks everything, and RLS — not the client —
  decides who sees it.

**Unlock:** `usePodActivation.ts` — `DEFAULT_POD_ACTIVATION = 6`, so pods start firing at
main round 6 for a new learner; a returning learner past R6 gets their current round pinned
once onto `course_enrollments.pod_activation_round`. From there `usePodLapScheduler.ts` runs
pods as an **independent track** on `completed_pod_rounds`, intake one exchange (a turn plus
its reply) per lap, scenes as walls. Belt-skipping does not avalanche; a skipped lap replays.

**Served, not inferred.** Running the resolver's exact filter anonymously:

```
spa_for_eng   → [{"slug":"pod-1","required_role":null}]
fin_for_eng   → [{"slug":"pod-0","required_role":null}]
cym_n_for_eng → []
cym_s_for_eng → []
```

and the sentence query for `cym_n_for_eng:pod-0` returns `[]` to an anonymous reader, while
`spa_for_eng:pod-1` returns the dialogue with clip ids attached:

```
1  Neighbour (8 am)  ¡Buenos días, Sarah!            f228573b-…
2  Sarah             Buenos días. ¿Cómo estás?       70a36d98-…
3  Neighbour         Muy bien, gracias. ¿Vas al trabajo?  f01f998c-…
```

**The `choice` pods are unreachable.** `spa_for_eng:music` is `visibility = 'live'` and
carries 1,074 clips / 80.9 minutes, and `spa_for_eng:travel-situations` is live with 72
sentences. Neither is a serving slug, and no code path in the learner app reads
`pod_type = 'choice'` — the only two mentions in the whole app are in `servedPod.test.ts`.
A learner cannot get to them.

---

## 5. Coverage — per language and per course

**Totals.** 149 course rows exist. 84 are reachable by a learner (`new_app_status` is not
`not_available`). Of those 84, **61 serve a pod and 23 do not**. Counting every course row,
64 serve a pod (63 excluding the `zzz_test2_for_eng` fixture, which I exclude from the
quality figures below and nowhere else).

**The 23 reachable courses with no pod:**

| Target language has pod content in a sibling course | Courses |
|---|---|
| **Yes — the language is done, this pair is not** (14) | `ara_lb_for_eng`, `deu_at_for_eng`, `deu_for_zho`, `eng_for_kan`, `eng_for_mar`, `eng_for_tel`, `fra_for_zho`, `ita_for_zho`, `kor_for_hin`, `kor_for_tam`, `spa_for_zho`, `zho_for_gle`, `zho_for_hin`, `zho_for_tam` |
| **No — the language has nothing anywhere** (9) | `afr_for_eng`, `ben_for_eng`, `ces_for_eng`, `cym_n_for_eng`, `cym_s_for_eng`, `glg_for_eng`, `hun_for_eng`, `rus_for_eng`, `srp_for_eng` |

That first row is the per-pair keying stated as a coverage fact: **14 reachable courses get
no listening at all in a language that already has a finished pod next door.** The whole
`for_zho`, `for_jpn` and `for_cym` families are in this position; across all 149 course rows
the same pattern covers 45 more unreleased courses.

**Varieties.** They are where the keying breaks most visibly.

- **Arabic** — `ara_for_eng` and `ara_eg_for_eng` both serve `pod-1`, 231 sentences each,
  fully recorded, 206 of 231 slots different (MSA vs Egyptian, which is correct).
  `ara_sy_for_eng` serves `pod-0` with **232 sentences but only 125 clips and 108 rows still
  flagged `target_text_draft`** — a live pod that is mostly silent draft.
  `ara_lb_for_eng` has nothing.
- **Welsh** — see §7. Nothing served, in either variety.
- **Irish** — `gle_for_eng` serves a full `pod-1`; `gle_cn`, `gle_mu`, `gle_ul` have nothing.
- **German** — `deu_for_eng` full `pod-1`; `deu_at_for_eng` and `deu_ch_for_eng` nothing.
- **Portuguese / Spanish / French** — the metropolitan and the American variety each have
  their own fully recorded pod, diverged as tabulated in §3.

**One more served-side hole:** `fin_for_eng` serves `pod-0` with **232 sentences, 19 clips
and 160 drafts**. It is live, and a Finnish learner reaching round 6 gets almost nothing.

---

## 6. What a layer-3 learner actually hears

Taking Spanish, the best-provisioned course on the estate:

- **One pod**, `spa_for_eng:pod-1`. 22 scenes, 231 sentences.
- **14.8 minutes** of Spanish dialogue audio (231 target clips). Counting every asset the lap
  touches — the English side, the explainers, the speed variants, the Take-G slices — 1,109
  clips and 63.9 minutes.
- **34 named characters** in the speaker labels, carried by **two actual voices**
  (`es-ES-ElviraNeural` and one xAI voice; four `voice_id` strings, two of them older naming
  generations of the same voice).
- The scenes, in the canonical slate's own titles: *A Day of Greetings (i)–(v)*,
  *Introductions*, *Coffee Shop*, *Pub*, *Restaurant*, *Shop*, *Hotel*, *Chemist's*,
  *Directions*, *Taxi*, seven scenes of *Extra phrases*, *First conversation*.

Fleet-wide, excluding the test fixture: a served `pod-0` averages **10.6 minutes** of target
audio, a served `pod-1` **15.6 minutes**. Distinct real voices per served pod:

| Distinct target voices | Courses |
|---:|---:|
| 1 | 1 |
| 2 | **50** |
| 3 | 3 |
| 5 | 7 |
| 6 | 2 |

**Plainly: there is no layer 3.** What is served everywhere is roughly a quarter of an hour
of A1/A2 transactional dialogue — ordering coffee, asking for a seat, the chemist's — spoken
by two voices playing thirty-odd characters. The nearest things to native-register listening
that exist at all are `spa_for_eng:music` (80.9 minutes, live but unreachable),
`ita_for_eng:method-pod` — "Tom and Aran Talk Bollocks", 309 sentences, 34.8 minutes, held —
and `cym_n_for_eng:senedd-s4c-steve`, a real Senedd committee session, 567 sentences, held
and role-gated to `previewer_001` with 41 of 567 clips rendered. They exist in three
languages between them and no ordinary learner reaches any of them.

---

## 7. Welsh — both memories are true, of different dates

Welsh pods **exist**: `cym_n_for_eng:pod-0` has 231 sentences and 147 clips;
`cym_s_for_eng:pod-0` has 231 sentences and **0** clips. `cym_n_for_eng:senedd-s4c-steve`
has 567 sentences and 41 clips.

Welsh learners **have real progress on them**: `learner_pod_state` holds 43 rows for 3
learners on `cym_n_for_eng` (last touched 2026-08-23) and 59 rows for 1 learner on
`cym_s_for_eng` (last touched 2026-07-22).

And **every Welsh pod row is `visibility = 'held'` today**, so the served answer is `[]` —
verified anonymously, above. The "no Welsh pods" ruling and the "Welsh learners have pod
progress" memory are both accurate; the progress is historical and nothing is served now.

---

## 8. Prior findings — what reproduced and what did not

**Reproduced exactly.**
- *Listening exercises: the real size, measured* (`486e4664`) — `spa_for_eng:pod-1` = 1,109
  clips / 63.9 min and `music` = 1,074 clips / 80.9 min. Both land on the same numbers today.
- *Pods: who is actually getting them* (`a1c8fe53`) — its claim that `cym_n`, `cym_s`, `rus`,
  `ces`, `ben` have no live pod to serve. All five confirmed: Welsh is held, and `rus_for_eng`,
  `ces_for_eng`, `ben_for_eng` have **no `listening_pods` row of any kind**.
- *Why the listening pods aren't surfacing* (`0f503372`) — `SERVING_POD_SLUGS` is still the
  hard gate it describes, and `servedPod.ts` still resolves everything unknown to `pod-0`.

**Did not reproduce.**
- The metagraph README (`services/shared/metagraph/README.md`) says the store was "derived and
  audited against all 231 rows of `canonical_pod_scenarios` where `pod_slug = 'pod-0'`". There
  are **zero** such rows today. The canonical slate was renamed `pod-0` → `pod-1` on
  2026-09-01 (`pod-dialogue-generator.cjs`, `CANONICAL_LIVE_SLUG`), and the slates previously
  called `pod-1` and `pod-0.5` were deleted the same day. The store is fine; its pointer is stale.
- The commission's pointer to `pod_voice_approvals`, `pod_voice_pools` and
  `listening_pod_visibility` as "tables in play" — **none of the three exists** in the database
  as a table or a view. Visibility is a column on `listening_pods`; voice approvals live in
  `services/pod-voice-approvals.cjs` against other storage.
- The commission's pointer that the metagraph is "NOT tracked on the dashboard branch" —
  it **is** on `origin/main`, at `services/shared/metagraph/` and `src/lib/metagraph/`, and
  I read it there. Job #268·D's home landed.
- `phase8-audio-v13.cjs`'s comment "Canon lives in `canonical_pod_scenarios` (`pod_slug='pod-0'`)"
  — same stale rename.

---

## 9. The distance from today to the two-step model

**Step one — metagraph to canonical pods. Partly built, and it stops before the canon.**
The metagraph store exists on `main`, is genuinely language-free, and carries 30 nodes,
27 moves, 28 edges, 9 outcome shapes and 5 authored walk-sets including `walks/pod-1.json`.
`canonical_pod_walk_steps` holds 709 node-reference steps in the database — but over **8
sector slugs only** (`health`, `retail`, `trades`, `hospitality`, `care-work`,
`learning-flagship`, two `method-pod` cuts). There are **no walk steps for `pod-1`**, the
canonical slate every served course is actually flexed from. So the walk layer exists, and
it does not yet cover the canon in production.

**Step two — canonical pod to languages. Built, but as a per-course act, not a per-language
one.** `pod-dialogue-generator.cjs` runs once per `course_code`, calls an LLM to flex the
English canon into that pair, and writes course-keyed rows. 64 courses were minted this way.
No table, column, constraint or code path in the pipeline is keyed on target language.

**What today does that is neither.** Three things:
1. **1,518 of 3,969 canonical rows already carry a target language**, and four canonical slugs
   are named for a course (`cym_n_for_eng:health`, `cym_s_for_eng:health`,
   `method-pod-43-scene` and `method-pod-chapters`, both Italian). Language has leaked upward
   into the canonical layer.
2. **The audio layer already keys per language** — 16 English courses, 2,272 sentence rows,
   187 clips — but only as a side-effect of identical text, with nothing holding the text
   identical. Where the generator ran twice, the sharing is gone.
3. **Divergence has already happened where it was not intended**: Catalan, same language,
   same dialect, 90 of 142 slots different.

**Counted, the gap between the model and the estate is:**
- 64 courses' worth of pod text stored per pair, covering **36 distinct target languages**.
- **23 reachable courses serving nothing**, 14 of them in a language a sibling course already has.
- **2 live pods serving mostly-silent draft** (`ara_sy_for_eng` 108 drafts, `fin_for_eng` 160 drafts).
- **0 walk steps** in the database for the canonical slate production actually uses.
- **~15 minutes** of A1/A2 transactional dialogue on **2 voices** as the whole of what a
  learner past round 6 hears, in every language that has anything at all.

---

## 10. Explicit gaps

- **No authenticated learner session.** Everything under "SERVED" was fetched with the app's
  publishable key through the same RLS policies the browser uses, which is the real read path
  for `listening_pods` and `listening_pod_sentences`. What I could **not** reach that way is
  anything behind `course_enrollments` — `pod_activation_round`, `completed_pod_rounds`, and
  therefore the actual lap a specific learner would be handed next. The activation rules in §4
  are a **code read** of `usePodActivation.ts` and `usePodLapScheduler.ts`, not a served
  observation, and I mark them as such.
- **No audio was played or downloaded.** Durations are `course_audio.duration_ms` as recorded,
  not measured from the files. Whether a clip is intact is not a question this stock-take asked.
- **`canonical_seeds` / `canonical_seed_translations` / `canonical_script_versions`** exist and
  plainly relate to the canonical layer; I did not open them, because the pod trail did not run
  through them and opening them would have been scope I was not asked for.
